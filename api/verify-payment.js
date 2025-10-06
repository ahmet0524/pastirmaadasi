// api/verify-payment.js (uzantı değiştirmeyin)
import Iyzipay from 'iyzipay';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token } = req.body; // Vercel otomatik parse eder

  const iyzipay = new Iyzipay({
    apiKey: process.env.IYZICO_API_KEY,
    secretKey: process.env.IYZICO_SECRET_KEY,
    uri: 'https://sandbox-api.iyzipay.com'
  });

  return new Promise((resolve) => {
    iyzipay.checkoutForm.retrieve({
      locale: Iyzipay.LOCALE.TR,
      token
    }, (err, result) => {
      if (err) {
        res.status(400).json({ status: 'error', errorMessage: err.errorMessage });
      } else {
        res.status(200).json(result);
      }
      resolve();
    });
  });
}