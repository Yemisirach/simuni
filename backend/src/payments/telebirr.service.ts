import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  constants,
  createHash,
  createVerify,
  publicEncrypt,
  randomBytes,
  randomUUID,
  sign as cryptoSign,
} from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
type Currency = string; type PaymentPurpose = string;

export type TelebirrCheckoutInput = {
  amount: number;
  currency: Currency;
  purpose: PaymentPurpose;
  reference: string;
  subject: string;
  description?: string;
  notifyUrl: string;
  returnUrl: string;
};

export type TelebirrCheckoutResult = {
  checkoutUrl?: string;
  receiveCode?: string;
  providerRef?: string;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
};

export type TelebirrNotifyResult = {
  reference: string | null;
  providerRef: string | null;
  paid: boolean;
  rawStatus: string | null;
  amount: number | null;
};

type FabricConfig = {
  baseUrl: string;
  webBaseUrl: string;
  fabricAppId: string;
  appSecret: string;
  merchantAppId: string;
  shortCode: string;
  privateKey: string;
  timeoutExpress: string;
  payeeType: string;
  businessType: string;
};

type LegacyConfig = {
  apiUrl: string;
  appId: string;
  appKey: string;
  shortCode: string;
  publicKey?: string;
};

const TELEBIRR_TEST_BASE_URL =
  'https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway';
const TELEBIRR_PRODUCTION_BASE_URL =
  'https://telebirrappcube.ethiomobilemoney.et:38443/apiaccess/payment/gateway';

@Injectable()
export class TelebirrService {
  async createCheckout(
    input: TelebirrCheckoutInput,
  ): Promise<TelebirrCheckoutResult> {
    if (process.env.TELEBIRR_MOCK === 'true') {
      return {
        checkoutUrl: `${input.returnUrl}?paymentReference=${encodeURIComponent(
          input.reference,
        )}&status=mock`,
        providerRef: `mock-${input.reference}`,
      };
    }

    const fabricConfig = this.getFabricConfig();
    if (fabricConfig) {
      if (process.env.TELEBIRR_CHECKOUT_MODE === 'web') {
        return this.createFabricWebCheckout(input, fabricConfig);
      }

      return this.createFabricInAppOrder(input, fabricConfig);
    }

    return this.createLegacyCheckout(input, this.getLegacyConfig());
  }

  verifyNotify(payload: Record<string, unknown>): TelebirrNotifyResult {
    if (process.env.TELEBIRR_MOCK !== 'true') {
      this.assertNotifySignature(payload);
    }

    const bizContent = this.recordValue(payload.biz_content);
    const reference =
      this.stringValue(payload.merch_order_id) ??
      this.stringValue(payload.merchantOrderId) ??
      this.stringValue(payload.outTradeNo) ??
      this.stringValue(payload.outTradeNumber) ??
      this.stringValue(payload.reference) ??
      this.stringValue(payload.merchOrderId) ??
      this.stringValue(bizContent?.merch_order_id);
    const status =
      this.stringValue(payload.trade_status) ??
      this.stringValue(payload.tradeStatus) ??
      this.stringValue(payload.status) ??
      this.stringValue(payload.result) ??
      this.stringValue(bizContent?.trade_status);
    const providerRef =
      this.stringValue(payload.trade_no) ??
      this.stringValue(payload.tradeNo) ??
      this.stringValue(payload.transactionNo) ??
      this.stringValue(payload.transId) ??
      this.stringValue(bizContent?.trade_no);
    const amount =
      this.numberValue(payload.total_amount) ??
      this.numberValue(payload.totalAmount) ??
      this.numberValue(payload.amount) ??
      this.numberValue(bizContent?.total_amount);

    return {
      reference,
      providerRef,
      paid: status
        ? ['SUCCESS', 'TRADE_SUCCESS', 'PAID', 'COMPLETED'].includes(
            status.toUpperCase(),
          )
        : false,
      rawStatus: status,
      amount,
    };
  }

  private async createFabricInAppOrder(
    input: TelebirrCheckoutInput,
    config: FabricConfig,
  ): Promise<TelebirrCheckoutResult> {
    const fabricToken = await this.applyFabricToken(config);
    const payload = this.buildFabricCreateOrderPayload(input, config);
    const body = await this.postJson(
      `${this.stripTrailingSlash(config.baseUrl)}/payment/v1/inapp/createOrder`,
      payload,
      {
        Authorization: fabricToken,
        'X-APP-Key': config.fabricAppId,
      },
    );
    const bizContent = this.recordValue(body.biz_content);
    const receiveCode =
      this.stringValue(bizContent?.receiveCode) ??
      this.stringValue(bizContent?.receive_code) ??
      this.stringValue(body.receiveCode) ??
      this.stringValue(body.receive_code);

    if (!receiveCode) {
      throw new ServiceUnavailableException(
        this.telebirrErrorMessage(body, 'Telebirr response did not include receiveCode'),
      );
    }

    return {
      receiveCode,
      providerRef:
        this.stringValue(bizContent?.prepay_id) ??
        this.stringValue(bizContent?.trade_no) ??
        this.stringValue(body.tradeNo) ??
        input.reference,
      requestPayload: payload,
      responsePayload: body,
    };
  }

  private async createFabricWebCheckout(
    input: TelebirrCheckoutInput,
    config: FabricConfig,
  ): Promise<TelebirrCheckoutResult> {
    const fabricToken = await this.applyFabricToken(config);
    const payload = this.buildFabricWebCheckoutPayload(input, config);
    const body = await this.postJson(
      `${this.stripTrailingSlash(config.baseUrl)}/payment/v1/merchant/preOrder`,
      payload,
      {
        Authorization: fabricToken,
        'X-APP-Key': config.fabricAppId,
      },
    );
    const bizContent = this.recordValue(body.biz_content);
    const prepayId =
      this.stringValue(bizContent?.prepay_id) ??
      this.stringValue(bizContent?.prepayId) ??
      this.stringValue(body.prepay_id) ??
      this.stringValue(body.prepayId);

    if (!prepayId) {
      throw new ServiceUnavailableException(
        this.telebirrErrorMessage(body, 'Telebirr response did not include prepay_id'),
      );
    }

    return {
      checkoutUrl: this.buildFabricPaygateUrl(prepayId, config),
      providerRef: prepayId,
      requestPayload: payload,
      responsePayload: body,
    };
  }

  private async applyFabricToken(config: FabricConfig) {
    const body = await this.postJson(
      `${this.stripTrailingSlash(config.baseUrl)}/payment/v1/token`,
      { appSecret: config.appSecret },
      {
        'X-APP-Key': config.fabricAppId,
      },
    );
    const bizContent = this.recordValue(body.biz_content);
    const token =
      this.stringValue(body.token) ?? this.stringValue(bizContent?.token);

    if (!token) {
      throw new ServiceUnavailableException(
        this.telebirrErrorMessage(body, 'Telebirr did not return a fabric token'),
      );
    }

    return token;
  }

  private buildFabricCreateOrderPayload(
    input: TelebirrCheckoutInput,
    config: FabricConfig,
  ) {
    const payload = {
      timestamp: Math.floor(Date.now() / 1000).toString(),
      nonce_str: randomBytes(16).toString('hex').toUpperCase(),
      method: 'payment.preorder',
      version: '1.0',
      biz_content: {
        notify_url: input.notifyUrl,
        redirect_url: input.returnUrl,
        trade_type: 'InApp',
        appid: config.merchantAppId,
        merch_code: config.shortCode,
        merch_order_id: input.reference,
        title: this.telebirrText(input.subject),
        total_amount: input.amount.toFixed(2),
        trans_currency: input.currency,
        timeout_express: config.timeoutExpress,
        payee_identifier: config.shortCode,
        payee_identifier_type: '04',
        payee_type: config.payeeType,
        callback_info: this.telebirrText(input.description),
      },
      sign_type: 'SHA256WithRSA',
    };

    return {
      ...payload,
      sign: this.signFabricPayload(payload, config.privateKey),
    };
  }

  private buildFabricWebCheckoutPayload(
    input: TelebirrCheckoutInput,
    config: FabricConfig,
  ) {
    const payload = {
      timestamp: Math.floor(Date.now() / 1000).toString(),
      nonce_str: randomBytes(16).toString('hex').toUpperCase(),
      method: 'payment.preorder',
      version: '1.0',
      biz_content: {
        notify_url: input.notifyUrl,
        redirect_url: input.returnUrl,
        appid: config.merchantAppId,
        merch_code: config.shortCode,
        merch_order_id: input.reference,
        timeout_express: config.timeoutExpress,
        trade_type: 'Checkout',
        title: this.telebirrText(input.subject),
        total_amount: input.amount.toFixed(2),
        trans_currency: input.currency,
        business_type: config.businessType,
        callback_info: this.telebirrText(input.description),
      },
      sign_type: 'SHA256WithRSA',
    };

    return {
      ...payload,
      sign: this.signFabricPayload(payload, config.privateKey),
    };
  }

  private buildFabricPaygateUrl(prepayId: string, config: FabricConfig) {
    const payload = {
      appid: config.merchantAppId,
      merch_code: config.shortCode,
      nonce_str: randomBytes(16).toString('hex').toUpperCase(),
      prepay_id: prepayId,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
    const sign = this.signFabricPayload(payload, config.privateKey);
    const params = new URLSearchParams({
      appid: payload.appid,
      merch_code: payload.merch_code,
      nonce_str: payload.nonce_str,
      prepay_id: payload.prepay_id,
      timestamp: payload.timestamp,
      sign,
      sign_type: 'SHA256WithRSA',
      version: '1.0',
      trade_type: 'Checkout',
    });

    return `${config.webBaseUrl}${config.webBaseUrl.includes('?') ? '&' : '?'}${params.toString()}`;
  }

  private signFabricPayload(payload: Record<string, unknown>, privateKey: string) {
    return cryptoSign('sha256', Buffer.from(this.buildFabricSignString(payload)), {
      key: privateKey,
      padding: constants.RSA_PKCS1_PSS_PADDING,
      saltLength: constants.RSA_PSS_SALTLEN_DIGEST,
    }).toString('base64');
  }

  private buildFabricSignString(payload: Record<string, unknown>) {
    const excluded = new Set([
      'sign',
      'sign_type',
      'header',
      'refund_info',
      'openType',
      'raw_request',
      'biz_content',
    ]);
    const fields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (!excluded.has(key) && this.isSignableValue(value)) {
        fields[key] = value;
      }
    }

    const bizContent = this.recordValue(payload.biz_content);
    for (const [key, value] of Object.entries(bizContent ?? {})) {
      if (!excluded.has(key) && this.isSignableValue(value)) {
        fields[key] = value;
      }
    }

    return Object.keys(fields)
      .sort()
      .map((key) => `${key}=${String(fields[key])}`)
      .join('&');
  }

  private assertNotifySignature(payload: Record<string, unknown>) {
    const signature =
      this.stringValue(payload.sign) ??
      this.stringValue(payload.signature) ??
      this.stringValue(payload.Signature);
    const publicKey = this.readNotifyPublicKey();

    if (!signature || !publicKey) {
      throw new ServiceUnavailableException(
        'Telebirr notification signature is not configured',
      );
    }

    const unsignedPayload = { ...payload };
    delete unsignedPayload.sign;
    delete unsignedPayload.signature;
    delete unsignedPayload.Signature;

    const signString = this.buildFabricSignString(unsignedPayload);
    const signatureBuffer = Buffer.from(signature, 'base64');

    if (
      !this.verifySignature(signString, signatureBuffer, publicKey, true) &&
      !this.verifySignature(signString, signatureBuffer, publicKey, false)
    ) {
      throw new ServiceUnavailableException(
        'Telebirr notification signature is invalid',
      );
    }
  }

  private verifySignature(
    signString: string,
    signature: Buffer,
    publicKey: string,
    pss: boolean,
  ) {
    try {
      const verifier = createVerify('sha256');
      verifier.update(signString);
      verifier.end();
      return verifier.verify(
        {
          key: publicKey,
          padding: pss ? constants.RSA_PKCS1_PSS_PADDING : constants.RSA_PKCS1_PADDING,
          saltLength: pss ? constants.RSA_PSS_SALTLEN_DIGEST : undefined,
        },
        signature,
      );
    } catch {
      return false;
    }
  }

  private async createLegacyCheckout(
    input: TelebirrCheckoutInput,
    config: LegacyConfig,
  ): Promise<TelebirrCheckoutResult> {
    const payload = this.buildLegacyPayload(input, config);
    const body = await this.postJson(config.apiUrl, payload);
    const checkoutUrl =
      this.stringValue(body.checkoutUrl) ??
      this.stringValue(body.toPayUrl) ??
      this.stringValue(body.paymentUrl) ??
      this.stringValue(body.webUrl) ??
      this.stringValue(this.recordValue(body.data)?.toPayUrl) ??
      this.stringValue(this.recordValue(body.data)?.checkoutUrl);

    if (!checkoutUrl) {
      throw new ServiceUnavailableException(
        this.telebirrErrorMessage(body, 'Telebirr response did not include checkout URL'),
      );
    }

    return {
      checkoutUrl,
      providerRef:
        this.stringValue(body.tradeNo) ??
        this.stringValue(body.transactionNo) ??
        this.stringValue(this.recordValue(body.data)?.tradeNo) ??
        undefined,
      requestPayload: payload,
      responsePayload: body,
    };
  }

  private buildLegacyPayload(input: TelebirrCheckoutInput, config: LegacyConfig) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14);
    const nonce = randomUUID().replace(/-/g, '');
    const bizContent = {
      merch_order_id: input.reference,
      title: this.telebirrText(input.subject),
      total_amount: input.amount.toFixed(2),
      trans_currency: input.currency,
      timeout_express: process.env.TELEBIRR_TIMEOUT ?? '30m',
      business_type: process.env.TELEBIRR_BUSINESS_TYPE ?? 'BuyGoods',
      notify_url: input.notifyUrl,
      redirect_url: input.returnUrl,
    };
    const signedFields = {
      appid: config.appId,
      merch_code: config.shortCode,
      nonce_str: nonce,
      timestamp,
      biz_content: JSON.stringify(bizContent),
      method: process.env.TELEBIRR_METHOD ?? 'payment.preorder',
      sign_type: 'SHA256WithRSA',
      version: '1.0',
    };

    return {
      ...signedFields,
      sign: this.signLegacyPayload(signedFields, config.appKey),
      ...(config.publicKey
        ? { encrypted: this.encrypt(JSON.stringify(bizContent), config.publicKey) }
        : {}),
    };
  }

  private signLegacyPayload(fields: Record<string, string>, appKey: string) {
    const base = Object.keys(fields)
      .sort()
      .map((key) => `${key}=${fields[key]}`)
      .join('&');

    return createHash('sha256')
      .update(`${base}&key=${appKey}`)
      .digest('hex')
      .toUpperCase();
  }

  private encrypt(value: string, publicKey: string) {
    return publicEncrypt(
      {
        key: publicKey.replace(/\\n/g, '\n'),
        padding: constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(value),
    ).toString('base64');
  }

  private async postJson(
    url: string,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ) {
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.telebirrRequestTimeoutMs()),
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        this.telebirrNetworkErrorMessage(error),
      );
    }

    const text = await response.text();
    const parsed = this.parseJson(text);

    if (!response.ok) {
      throw new ServiceUnavailableException(
        this.telebirrErrorMessage(parsed, 'Telebirr request failed'),
      );
    }

    return parsed;
  }

  private telebirrNetworkErrorMessage(error: unknown) {
    const cause = (error as { cause?: { code?: string; message?: string } })
      ?.cause;
    const detail =
      cause?.code ?? cause?.message ?? (error instanceof Error ? error.message : null);

    return detail
      ? `Telebirr network request failed (${detail})`
      : 'Telebirr network request failed';
  }

  private telebirrRequestTimeoutMs() {
    const raw = Number(process.env.TELEBIRR_REQUEST_TIMEOUT_MS);
    return Number.isFinite(raw) && raw > 0 ? raw : 15000;
  }

  private getFabricConfig(): FabricConfig | null {
    const fabricAppId = process.env.TELEBIRR_FABRIC_APP_ID;
    const appSecret =
      process.env.TELEBIRR_APP_SECRET ?? process.env.TELEBIRR_FABRIC_APP_SECRET;
    const merchantAppId = process.env.TELEBIRR_MERCHANT_APP_ID;
    const shortCode = process.env.TELEBIRR_SHORT_CODE;
    const privateKey = this.readPrivateKey();

    if (!fabricAppId && !appSecret && !merchantAppId && !privateKey) {
      return null;
    }

    if (!fabricAppId || !appSecret || !merchantAppId || !shortCode || !privateKey) {
      throw new ServiceUnavailableException('Telebirr Fabric is not configured');
    }

    const telebirrEnv =
      process.env.TELEBIRR_ENV ?? process.env.TELEBIRR_ENVIRONMENT;

    return {
      baseUrl:
        process.env.TELEBIRR_BASE_URL ??
        (telebirrEnv === 'production'
          ? TELEBIRR_PRODUCTION_BASE_URL
          : TELEBIRR_TEST_BASE_URL),
      webBaseUrl:
        process.env.TELEBIRR_WEB_BASE_URL ??
        (telebirrEnv === 'production'
          ? 'https://telebirrappcube.ethiomobilemoney.et:38443/payment/web/paygate'
          : 'https://developerportal.ethiotelebirr.et:38443/payment/web/paygate'),
      fabricAppId,
      appSecret,
      merchantAppId,
      shortCode,
      privateKey,
      timeoutExpress: process.env.TELEBIRR_TIMEOUT ?? '120m',
      payeeType: process.env.TELEBIRR_PAYEE_TYPE ?? '3000',
      businessType: process.env.TELEBIRR_BUSINESS_TYPE ?? 'BuyGoods',
    };
  }

  private getLegacyConfig(): LegacyConfig {
    const apiUrl = process.env.TELEBIRR_API_URL;
    const appId = process.env.TELEBIRR_APP_ID;
    const appKey = process.env.TELEBIRR_APP_KEY;
    const shortCode = process.env.TELEBIRR_SHORT_CODE;

    if (!apiUrl || !appId || !appKey || !shortCode) {
      throw new ServiceUnavailableException('Telebirr is not configured');
    }

    return {
      apiUrl,
      appId,
      appKey,
      shortCode,
      publicKey: process.env.TELEBIRR_PUBLIC_KEY,
    };
  }

  private readPrivateKey() {
    const rawPrivateKey = process.env.TELEBIRR_PRIVATE_KEY;
    if (rawPrivateKey) {
      return this.normalizePrivateKey(rawPrivateKey);
    }

    const privateKeyPath = process.env.TELEBIRR_PRIVATE_KEY_PATH;
    if (!privateKeyPath) {
      return null;
    }

    return this.normalizePrivateKey(readFileSync(resolve(privateKeyPath), 'utf8'));
  }

  private readNotifyPublicKey() {
    const rawPublicKey =
      process.env.TELEBIRR_NOTIFY_PUBLIC_KEY ?? process.env.TELEBIRR_PUBLIC_KEY;
    if (rawPublicKey) {
      return this.normalizePublicKey(rawPublicKey);
    }

    const publicKeyPath =
      process.env.TELEBIRR_NOTIFY_PUBLIC_KEY_PATH ??
      process.env.TELEBIRR_PUBLIC_KEY_PATH;
    if (!publicKeyPath) {
      return null;
    }

    return this.normalizePublicKey(readFileSync(resolve(publicKeyPath), 'utf8'));
  }

  private normalizePrivateKey(value: string) {
    const trimmed = value.trim().replace(/\\n/g, '\n');
    if (
      trimmed.includes('BEGIN PRIVATE KEY') ||
      trimmed.includes('BEGIN RSA PRIVATE KEY')
    ) {
      return trimmed;
    }

    return `-----BEGIN PRIVATE KEY-----\n${trimmed
      .match(/.{1,64}/g)
      ?.join('\n')}\n-----END PRIVATE KEY-----`;
  }

  private normalizePublicKey(value: string) {
    const trimmed = value.trim().replace(/\\n/g, '\n');
    if (trimmed.includes('BEGIN PUBLIC KEY')) {
      return trimmed;
    }

    return `-----BEGIN PUBLIC KEY-----\n${trimmed
      .match(/.{1,64}/g)
      ?.join('\n')}\n-----END PUBLIC KEY-----`;
  }

  private telebirrErrorMessage(
    body: Record<string, unknown>,
    fallback: string,
  ) {
    return (
      this.stringValue(body.msg) ??
      this.stringValue(body.message) ??
      this.stringValue(body.errorMsg) ??
      this.stringValue(body.result) ??
      fallback
    );
  }

  private parseJson(text: string): Record<string, unknown> {
    try {
      return text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      throw new ServiceUnavailableException('Telebirr returned a non-JSON response');
    }
  }

  private stripTrailingSlash(value: string) {
    return value.replace(/\/+$/, '');
  }

  private telebirrText(value?: string) {
    return (value || 'Nore payment')
      .replace(/[~`!#$%^*()\-=+|/<>?;:"[\]{}\\&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
  }

  private isSignableValue(value: unknown) {
    return value !== undefined && value !== null && value !== '';
  }

  private recordValue(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value) as unknown;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : null;
      } catch {
        return null;
      }
    }

    return null;
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private numberValue(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
