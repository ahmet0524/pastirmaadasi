// src/pages/api/payment-callback.js

export default async function handler(req, res) {
  console.log('=== PAYMENT CALLBACK ===');
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Body:', req.body);
  console.log('Query:', req.query);

  try {
    let token = null;

    if (req.method === 'POST') {
      // iyzico genellikle form-urlencoded gönderiyor olabilir
      token = req.body?.token;
      console.log('POST token from body:', token);

      // Eğer body string ise parse et
      if (typeof req.body === 'string') {
        const params = new URLSearchParams(req.body);
        token = params.get('token');
        console.log('POST token from parsed string:', token);
      }
    } else if (req.method === 'GET') {
      token = req.query?.token;
      console.log('GET token:', token);
    } else {
      console.log('Method not allowed:', req.method);
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (token) {
      console.log('Redirecting with token:', token);
      res.writeHead(302, { Location: `/odeme-sonuc?token=${token}` });
      return res.end();
    } else {
      console.log('No token found');
      res.writeHead(302, { Location: '/odeme-sonuc?error=no-token' });
      return res.end();
    }
  } catch (error) {
    console.error('Callback error:', error);
    res.writeHead(302, { Location: '/odeme-sonuc?error=callback-failed' });
    return res.end();
  }
}