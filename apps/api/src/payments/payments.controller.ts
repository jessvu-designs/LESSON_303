import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { PaymentMethod } from '@parking/shared-types';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService, type SetupIntentResponse } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get('payment-methods')
  list(@CurrentUser() user: { id: string }): Promise<PaymentMethod[]> {
    return this.payments.listForUser(user.id);
  }

  @Post('setup-intent')
  setupIntent(@CurrentUser() user: { id: string }): Promise<SetupIntentResponse> {
    return this.payments.createSetupIntent(user.id);
  }

  /** After PaymentSheet returns success, refresh local cache from Stripe. */
  @Post('sync')
  sync(@CurrentUser() user: { id: string }): Promise<PaymentMethod[]> {
    return this.payments.syncFromStripe(user.id);
  }

  /** Dev-only: works only when Stripe is not configured. */
  @Post('payment-methods/stub')
  addStub(@CurrentUser() user: { id: string }): Promise<PaymentMethod> {
    return this.payments.addStubCard(user.id);
  }

  @Delete('payment-methods/:id')
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    await this.payments.remove(user.id, id);
    return { ok: true };
  }
}
