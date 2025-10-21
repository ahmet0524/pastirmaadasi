// src/pages/api/payment-callback.js

// Body parser'ı devre dışı bırak, manuel parse edeceğiz
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  console.log('=== PAYMENT CALLBACK START ===');
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('URL:', req.url);

  try {
    let token = null;

    if (req.method === 'POST') {
      // Raw body'yi al
      const rawBody = await getRawBody(req);
      console.log('Raw body:', rawBody);

      // Content-type'a göre parse et
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        const body = JSON.parse(rawBody);
        console.log('Parsed JSON:', body);
        token = body.token;
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(rawBody);
        console.log('Parsed form data:', Object.fromEntries(params));
        token = params.get('token');
      } else {
        // Bilinmeyen format, her iki yöntemi de dene
        try {
          const body = JSON.parse(rawBody);
          token = body.token;
        } catch {
          const params = new URLSearchParams(rawBody);
          token = params.get('token');
        }
      }

      console.log('Extracted token:', token);
    } else if (req.method === 'GET') {
      // URL'den token'ı al
      const url = new URL(req.url, `http://${req.headers.host}`);
      token = url.searchParams.get('token');
      console.log('GET token:', token);
    } else {
      console.log('Method not allowed');
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Redirect
    if (token) {
      console.log('SUCCESS: Redirecting with token');
      res.writeHead(302, { Location: `/odeme-sonuc?token=${token}` });
      res.end();
    } else {
      console.log('ERROR: No token found');
      res.writeHead(302, { Location: '/odeme-sonuc?error=no-token' });
      res.end();
    }
  } catch (error) {
    console.error('FATAL ERROR:', error);
    res.writeHead(302, { Location: '/odeme-sonuc?error=callback-failed' });
    res.end();
  }
}