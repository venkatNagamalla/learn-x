
import crypto from 'node:crypto';

const sha512 = (value) =>
  crypto.createHash('sha512').update(value).digest('hex');

// Generate the SHA-512 hash for PayU Hosted Checkout.
export const generatePayURequestHash = ({
  key,
  txnid,
  amount,
  productinfo,
  firstname,
  email,
  salt,
}) => {
  const hashString = [
    key,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    '', // udf1
    '', // udf2
    '', // udf3
    '', // udf4
    '', // udf5
    '', // empty field 1
    '', // empty field 2
    '', // empty field 3
    '', // empty field 4
    '', // empty field 5
    salt,
  ].join('|');

  return sha512(hashString);
};

// Verify the reverse SHA-512 hash returned by PayU.

export const verifyPayUResponseHash = (data, salt) => {
  if (!data?.hash || !data?.status || !data?.txnid || !data?.key) {
    return false;
  }

  const fields = [
    data.status,
    '',
    '',
    '',
    '',
    '',
    data.udf5 || '',
    data.udf4 || '',
    data.udf3 || '',
    data.udf2 || '',
    data.udf1 || '',
    data.email || '',
    data.firstname || '',
    data.productinfo || '',
    data.amount || '',
    data.txnid,
    data.key,
  ];

  let hashString;

  const additionalCharges =
    data.additionalCharges || data.additional_charges;

  if (additionalCharges) {
    hashString = [
      additionalCharges,
      salt,
      ...fields,
    ].join('|');
  } else if (data.splitInfo) {
    hashString = [
      salt,
      data.status,
      data.splitInfo,
      '',
      '',
      '',
      '',
      '',
      '',
      data.udf5 || '',
      data.udf4 || '',
      data.udf3 || '',
      data.udf2 || '',
      data.udf1 || '',
      data.email || '',
      data.firstname || '',
      data.productinfo || '',
      data.amount || '',
      data.txnid,
      data.key,
    ].join('|');
  } else {
    hashString = [salt, ...fields].join('|');
  }

  const calculatedHash = sha512(hashString);
  const receivedHash = String(data.hash).toLowerCase();

  if (!/^[a-f0-9]{128}$/.test(receivedHash)) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(calculatedHash, 'hex'),
    Buffer.from(receivedHash, 'hex')
  );
};

// Generate the hash for PayU Verify Payment API.
export const generatePayUVerifyHash = ({
  key,
  txnid,
  salt,
}) => {
  const hashString = [
    key,
    'verify_payment',
    txnid,
    salt,
  ].join('|');

  return sha512(hashString);
};


// Verify a transaction directly with PayU.
export const verifyPayUTransaction = async ({
  key,
  salt,
  baseUrl,
  txnid,
}) => {
  const hash = generatePayUVerifyHash({
    key,
    txnid,
    salt,
  });

  const endpoint =
    `${baseUrl.replace(/\/+$/, '')}/merchant/postservice.php?form=2`;

  const body = new URLSearchParams({
    key,
    command: 'verify_payment',
    var1: txnid,
    hash,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error('PayU verification request failed.');
  }

  const data = await response.json();

  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response received from PayU.');
  }

  return {
    apiStatus: data.status,
    transaction: data.transaction_details?.[txnid] || null,
  };
};