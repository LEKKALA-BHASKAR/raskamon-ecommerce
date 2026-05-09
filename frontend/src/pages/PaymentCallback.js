/**
 * PaymentCallback page
 *
 * Route: /payment/callback
 *
 * PhonePe and Airpay redirect the user back here after payment.
 * Query params set by our backend redirect URLs:
 *   ?gateway=phonepe&txnId=TXN-xxx
 *   ?gateway=airpay&txnId=TXN-xxx&status=success
 *
 * Airpay also appends its own form params in the query string.
 * This page verifies the payment server-side and shows the result.
 */
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import PaymentStatus, { ProcessingScreen } from '../components/payment/PaymentStatus';
import api from '../utils/api';
import { useCart } from '../context/CartContext';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { clearCart }  = useCart();
  const verified       = useRef(false);

  const [screen, setScreen]  = useState('processing'); // processing | success | failed
  const [orderId, setOrderId] = useState('');
  const [amount, setAmount]   = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const gateway = searchParams.get('gateway');
  const txnId   = searchParams.get('txnId');

  useEffect(() => {
    if (!gateway || !txnId || verified.current) return;
    verified.current = true;

    (async () => {
      try {
        let res;

        if (gateway === 'phonepe') {
          res = await api.post('/payments/phonepe/verify', { transaction_id: txnId });
        }

        else if (gateway === 'airpay') {
          // Collect all query params Airpay appended
          const params = {};
          searchParams.forEach((v, k) => { params[k] = v; });
          res = await api.post('/payments/airpay/verify', {
            transaction_id: txnId,
            airpay_params:  params,
          });
        }

        else {
          throw new Error(`Unknown gateway: ${gateway}`);
        }

        // Fetch the transaction so we can show amount
        const txnRes = await api.get(`/payments/transaction/${txnId}`);
        setAmount(txnRes.data?.amount);
        setOrderId(res.data?.order_id || '');
        await clearCart();
        setScreen('success');

      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || 'Payment verification failed';
        setErrorMsg(msg);
        setScreen('failed');
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => navigate('/checkout');

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-16">
        <PaymentStatus
          status={screen}
          orderId={orderId}
          amount={amount}
          gateway={gateway}
          errorMsg={errorMsg}
          onRetry={handleRetry}
        />
      </div>
    </Layout>
  );
};

export default PaymentCallback;
