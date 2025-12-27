/**
 * Simple Bytes Contact Form Worker
 *
 * Handles form submissions with:
 * - Cloudflare Turnstile verification
 * - Honeypot spam detection
 * - Email sending via MailLayer
 *
 * Environment variables required:
 * - TURNSTILE_SECRET_KEY: Cloudflare Turnstile secret key
 * - MAILLAYER_API_KEY: MailLayer API key
 * - ADMIN_EMAIL: Email to receive submissions (default: hello@simplebytes.com)
 * - FROM_EMAIL: Email to send from (e.g., noreply@simplebytes.com)
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
				subject: `We received your message - Simple Bytes`,
				html: getConfirmationEmailHtml(name, projectLabel, topicLabel, message),
			});

			// Send notification to admin
			await sendEmail(env, {
				to: env.ADMIN_EMAIL || 'hello@simplebytes.com',
				replyTo: email,
				subject: `[${projectLabel}] ${topicLabel} from ${name}`,
				html: getAdminEmailHtml(name, email, projectLabel, topicLabel, message),
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

async function sendEmail(env, { to, replyTo, subject, html }) {
	const response = await fetch('https://api.maillayer.com/v1/send', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${env.MAILLAYER_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: env.FROM_EMAIL || 'noreply@simplebytes.com',
			to,
			reply_to: replyTo,
			subject,
			html,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`MailLayer error: ${error}`);
	}

	return response.json();
}

function getConfirmationEmailHtml(name, project, topic, message) {
	return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="border-bottom: 1px solid #e5e5e5; padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="font-size: 24px; font-weight: 600; margin: 0;">Simple Bytes</h1>
    </div>

    <p>Hi ${escapeHtml(name)},</p>

    <p>Thank you for reaching out! We've received your message and will get back to you as soon as possible.</p>

    <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Project:</strong> ${escapeHtml(project)}</p>
        <p style="margin: 0 0 10px 0;"><strong>Topic:</strong> ${escapeHtml(topic)}</p>
        <p style="margin: 0 0 10px 0;"><strong>Your message:</strong></p>
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>

    <p>Best regards,<br>The Simple Bytes Team</p>

    <div style="border-top: 1px solid #e5e5e5; padding-top: 20px; margin-top: 20px; font-size: 12px; color: #737373;">
        <p style="margin: 0;">This is an automated confirmation. Please do not reply to this email.</p>
        <p style="margin: 10px 0 0 0;"><a href="https://simplebytes.com" style="color: #525252;">simplebytes.com</a></p>
    </div>
</body>
</html>
`;
}

function getAdminEmailHtml(name, email, project, topic, message) {
	return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #171717; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="border-bottom: 1px solid #e5e5e5; padding-bottom: 20px; margin-bottom: 20px;">
        <h1 style="font-size: 24px; font-weight: 600; margin: 0;">New Contact Form Submission</h1>
    </div>

    <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
        <p style="margin: 0 0 10px 0;"><strong>Project:</strong> ${escapeHtml(project)}</p>
        <p style="margin: 0;"><strong>Topic:</strong> ${escapeHtml(topic)}</p>
    </div>

    <div style="background: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px;">
        <p style="margin: 0 0 10px 0;"><strong>Message:</strong></p>
        <p style="margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>

    <p style="margin-top: 20px; font-size: 12px; color: #737373;">
        Reply directly to this email to respond to ${escapeHtml(name)}.
    </p>
</body>
</html>
`;
}

function escapeHtml(text) {
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;',
	};
	return String(text).replace(/[&<>"']/g, m => map[m]);
}
