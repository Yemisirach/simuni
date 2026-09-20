import { Body, Controller, Get, Param, Post, Query, Header } from '@nestjs/common';
import { Public } from '@thallesp/nestjs-better-auth';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { TelebirrService } from './telebirr.service';

@Controller()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService, private telebirr: TelebirrService) {}

  /** Kicks off a telebirr checkout for an invoice — returns a URL to open. */
  @Post('invoices/:id/pay/telebirr')
  startCheckout(@CurrentUser() user, @Param('id') id: string) {
    return this.paymentsService.startCheckout(user.workspaceId, id);
  }

  @Get('invoices/:id/payments')
  listPayments(@CurrentUser() user, @Param('id') id: string) {
    return this.paymentsService.findForInvoice(user.workspaceId, id);
  }

  /**
   * Public — telebirr calls this server-to-server once a payment completes
   * (or fails). Must stay public: there's no Simuni session on this
   * request, only telebirr's own request signature (verified below).
   */
  @Public()
  @Post('payments/telebirr/notify')
  async notify(@Body() body: Record<string, any>) {
    const raw = JSON.stringify(body);
    let result;
    try {
      result = this.telebirr.verifyNotify(body);
    } catch (e) {
      // invalid signature or other verification error
      return { code: 1, msg: 'invalid signature' };
    }

    if (result.reference) {
      if (result.paid) {
        await this.paymentsService.handleConfirmedPayment(result.reference, result.providerRef || undefined, raw);
      } else if (result.rawStatus === 'FAILED' || result.rawStatus === 'EXPIRED') {
        await this.paymentsService.markFailed(result.reference, raw);
      }
    }

    return { code: 0, msg: 'success' };
  }

  /**
   * Public — the customer's browser/webview lands here after completing (or
   * cancelling) payment in telebirr. Renders a plain page rather than JSON
   * since a human is looking at it; the mobile app polls/refreshes the
   * invoice separately rather than relying on this page alone (webviews and
   * app-switching make catching a redirect unreliable).
   */
  @Public()
  @Get('payments/telebirr/return')
  @Header('Content-Type', 'text/html')
  handleReturn(@Query() query: Record<string, any>) {
    let ok = false;
    try {
      const result = this.telebirr.verifyNotify(query);
      ok = result.paid;
    } catch (e) {
      ok = false;
    }
    const title = ok ? 'Payment received' : 'Payment not confirmed yet';
    const body = ok
      ? 'Thanks — your payment was received. You can close this window and return to the Simuni app.'
      : "We couldn't confirm this payment yet. If money left your telebirr account, it will be reflected shortly — you can close this window.";

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${title}</title>
      <style>body{font-family:-apple-system,sans-serif;background:#F5F7F6;color:#1A1F1D;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px;}
      div{max-width:360px}h1{color:#0F7A5C;font-size:20px}p{color:#6B7772;font-size:14px;line-height:1.5}</style>
      </head><body><div><h1>${title}</h1><p>${body}</p></div></body></html>`;
  }
}
