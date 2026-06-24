function doPost(event) {
  try {
    var payload = JSON.parse(event.postData.contents);
    var expectedToken =
      PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN');

    if (!expectedToken || payload.token !== expectedToken) {
      return jsonResponse({ ok: false, error: 'Unauthorized' });
    }

    if (
      typeof payload.to !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.to) ||
      !/^\d{6}$/.test(String(payload.code))
    ) {
      return jsonResponse({ ok: false, error: 'Invalid request' });
    }

    var code = String(payload.code);
    MailApp.sendEmail({
      to: payload.to,
      subject: 'Your Murmur password reset code',
      name: 'Murmur',
      body:
        'Your Murmur password reset code is ' +
        code +
        '. It expires in 10 minutes. If you did not request this, ignore this email.',
      htmlBody:
        '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1e293b">' +
        '<h1 style="color:#e11d48;font-size:28px;margin-bottom:12px">Murmur</h1>' +
        '<p>Use this code to reset your password:</p>' +
        '<div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:18px 20px;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;text-align:center">' +
        code +
        '</div>' +
        '<p style="color:#64748b">The code expires in 10 minutes. If you did not request it, you can ignore this email.</p>' +
        '</div>',
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error && error.message ? error.message : 'Email delivery failed',
    });
  }
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
