import 'reflect-metadata';
import { Container } from 'inversify';

import { createRestApplicationContainer, RestApplication } from './rest/index.js';
import { COMPONENT_MAP } from './shared/types/index.js';
import { createUserContainer } from './shared/modules/user/index.js';
import { createOfferContainer } from './shared/modules/offer/index.js';
import { createCommentContainer } from './shared/modules/comment/index.js';
import { createAuthContainer } from './shared/modules/auth/index.js';


async function bootstrap() {
  const appContainer = Container.merge(
    createRestApplicationContainer(),
    createUserContainer(),
    createOfferContainer(),
    createCommentContainer(),
    createAuthContainer(),
  );

  const application = appContainer.get<RestApplication>(COMPONENT_MAP.REST_APPLICATION);
  await application.init();
}

bootstrap();
