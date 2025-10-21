// api/payment-callback.js
export default async function handler(req, res) {
  if (req.method === 'POST') {
    // iyzico POST callback'i - token'Ä± al ve GET'e redirect et
    const { token } = req.body;

    if (token) {
      res.redirect(302, `/odeme-sonuc?token=${token}`);
    } else {
      res.redirect(302, '/odeme-sonuc?error=no-token');
    }
  } else if (req.method === 'GET') {
    // iyzico bazen GET ile de çağırabilir
    const { token } = req.query;

    if (token) {
      res.redirect(302, `/odeme-sonuc?token=${token}`);
    } else {
      res.redirect(302, '/odeme-sonuc?error=no-token');
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}