import { createHash } from 'node:crypto';

export function createCloudinarySignature(parameters, apiSecret) {
  const parameterString = Object.entries(parameters)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1').update(`${parameterString}${apiSecret}`).digest('hex');
}