/**
 * Simple Bytes Contact Form Worker
 *
 * Handles form submissions with:
 * - Cloudflare Turnstile verification
 * - Honeypot spam detection
 * - Email sending via MailLayer templates
 *
 * Environment variables required:
 * - TURNSTILE_SECRET_KEY: Cloudflare Turnstile secret key
 * - CONFIRMATION_TEMPLATE_ID: MailLayer template ID for user confirmation
 * - ADMIN_TEMPLATE_ID: MailLayer template ID for admin notification
 * - ADMIN_EMAIL: Email to receive submissions (default: hello@simplebytes.com)
 *
 * Template variables available:
 * - [name]: Sender's name
 * - [email]: Sender's email
 * - [project]: Selected project name
 * - [topic]: Selected topic
 * - [message]: Message content
 */

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': 'https://simplebytes.com',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

const PROJECT_LABELS = {
	'general': 'General Inquiry',
	'domain-details': 'Domain Details',
	'doodlify': 'Doodlify',
	'easychef': 'EasyChef.ai',
	'og-image-preview': 'OG Image Preview',
	'ig-grid-planner': 'IG Grid Planner',
	'launchpage': 'Launchpage.xyz',
};

const TOPIC_LABELS = {
	'support': 'Support',
	'information': 'Information',
	'gdpr': 'GDPR Request',
	'partnership': 'Partnership',
	'bug': 'Bug Report',
	'other': 'Other',
};

export default {
	async fetch(request, env) {
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: CORS_HEADERS });
		}

		if (request.method !== 'POST') {
			return jsonResponse({ success: false, message: 'Method not allowed' }, 405);
		}

		try {
			const data = await request.json();
			const { name, email, project, topic, message, website, turnstileToken } = data;

			// Honeypot check - if filled, silently "succeed" (bot detected)
			if (website && website.trim() !== '') {
				// Return fake success to confuse bots
				return jsonResponse({ success: true });
			}

			// Validate required fields
			if (!name || !email || !project || !topic || !message) {
				return jsonResponse({ success: false, message: 'All fields are required' }, 400);
			}

			// Validate email format
			if (!isValidEmail(email)) {
				return jsonResponse({ success: false, message: 'Invalid email address' }, 400);
			}

			// Verify Turnstile token
			const turnstileValid = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY);
			if (!turnstileValid) {
				return jsonResponse({ success: false, message: 'Security verification failed. Please try again.' }, 400);
			}

			// Get human-readable labels
			const projectLabel = PROJECT_LABELS[project] || project;
			const topicLabel = TOPIC_LABELS[topic] || topic;

			// Send confirmation email to submitter
			await sendEmail(env, {
				to: email,
				templateId: env.CONFIRMATION_TEMPLATE_ID,
				variables: {
					name,
					email,
					project: projectLabel,
					topic: topicLabel,
					message,
				},
			});

			// Send notification to admin
			await sendEmail(env, {
				to: env.ADMIN_EMAIL || 'hello@simplebytes.com',
				replyTo: email,
				templateId: env.ADMIN_TEMPLATE_ID,
				variables: {
					name,
					email,
					project: projectLabel,
					topic: topicLabel,
					message,
				},
			});

			return jsonResponse({ success: true });

		} catch (error) {
			console.error('Error processing contact form:', error);
			return jsonResponse({ success: false, message: 'An error occurred. Please try again.' }, 500);
		}
	},
};

function jsonResponse(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...CORS_HEADERS,
		},
	});
}

function isValidEmail(email) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function verifyTurnstile(token, secretKey) {
	if (!token || !secretKey) return false;

	const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			secret: secretKey,
			response: token,
		}),
	});

	const result = await response.json();
	return result.success === true;
}

async function sendEmail(env, { to, replyTo, templateId, variables }) {
	const response = await fetch('https://mail.simplebytes.com/api/transactional/send', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			apiKey: templateId,
			to,
			replyTo,
			variables,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`MailLayer error: ${error}`);
	}

	return response.json();
}
