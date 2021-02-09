import { Request, Response } from './requestResponseDTO';
import { Result } from '../../domain/Result';
import { UseCase } from '../../domain/useCase';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';

dotenv.config();

const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2020-08-27',
  typescript: true,
});

export class Payment implements UseCase<Request, Response> {
  public async execute(request: Request): Promise<Result<Response>> {
    const { email, token, extension } = request;

    const charge = await stripe.charges.create({
      source: token,
      amount: 150,
      description: 'HideFaces.app',
      currency: 'eur',
    });

    const id = charge.id.split('ch_')[1];
    const zip = charge.billing_details.address?.postal_code;

    const response: Response = {
      id,
      url: 'https://.....',
    };

    return Result.ok<Response>(response);
  }
}
