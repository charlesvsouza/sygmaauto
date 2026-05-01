import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { CompleteTenantSetupDto } from './dto/onboarding.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get(':token')
  getInvite(@Param('token') token: string) {
    return this.onboardingService.getInvite(token);
  }

  @Post(':token/complete')
  completeSetup(@Param('token') token: string, @Body() dto: CompleteTenantSetupDto) {
    return this.onboardingService.completeSetup(token, dto);
  }
}
