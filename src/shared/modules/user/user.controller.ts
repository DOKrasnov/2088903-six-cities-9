import { inject, injectable } from 'inversify';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import {
  BaseController, DocumentExistsMiddleware,
  HttpError,
  HttpMethod, PrivateRouteMiddleware, RejectAuthenticatedMiddleware,
  UploadFileMiddleware,
  ValidateDTOMiddleware, ValidateObjectIdMiddleware
} from '../../libs/rest/index.js';
import { Logger } from '../../libs/logger/index.js';
import { COMPONENT_MAP } from '../../types/index.js';
import { CreateUserRequest } from './create-user-request.type.js';
import { UserRDO } from './rdo/user.rdo.js';
import { UserService } from './user-service.interface.js';
import { Config, RestSchema } from '../../libs/config/index.js';
import { fillDTO } from '../../helpers/common.js';
import { LoginUserRequest } from './login-user-request.type.js';
import { CreateUserDTO } from './dto/create-user.dto.js';
import { LoginUserDTO } from './dto/login-user.dto.js';
import { AuthService } from '../auth/index.js';
import { LoggedUserRDO } from './rdo/logged-user.rdo.js';
import {OfferService, ParamOfferId, ShortOfferRDO} from '../offer/index.js';
import { UploadUserAvatarRDO } from './rdo/upload-user-avatar.rdo.js';

@injectable()
export class UserController extends BaseController {
  constructor(
    @inject(COMPONENT_MAP.LOGGER) protected readonly logger: Logger,
    @inject(COMPONENT_MAP.USER_SERVICE) private readonly userService: UserService,
    @inject(COMPONENT_MAP.CONFIG) private readonly configService: Config<RestSchema>,
    @inject(COMPONENT_MAP.AUTH_SERVICE) private readonly authService: AuthService,
    @inject(COMPONENT_MAP.OFFER_SERVICE) private readonly offerService: OfferService,
  ) {
    super(logger);
    this.logger.info('Register routes for UserController');

    this.addRoute({
      path: '/register',
      method: HttpMethod.Post,
      handler: this.create,
      middlewares: [
        new RejectAuthenticatedMiddleware(),
        new ValidateDTOMiddleware(CreateUserDTO)
      ]
    });
    this.addRoute({
      path: '/login',
      method: HttpMethod.Get,
      handler: this.checkAuthenticate,
    });
    this.addRoute({
      path: '/login',
      method: HttpMethod.Post,
      handler: this.login,
      middlewares: [new ValidateDTOMiddleware(LoginUserDTO)]
    });
    this.addRoute({
      path: '/:userId/avatar',
      method: HttpMethod.Post,
      handler: this.uploadAvatar,
      middlewares: [
        new PrivateRouteMiddleware(),
        new ValidateObjectIdMiddleware('userId'),
        new UploadFileMiddleware(this.configService.get('UPLOAD_DIRECTORY'), 'avatar'),
      ]
    });
    this.addRoute({
      path: '/favorites',
      method: HttpMethod.Get,
      handler: this.showFavorites,
      middlewares: [new PrivateRouteMiddleware()]
    });
    this.addRoute({
      path: '/favorites/:offerId',
      method: HttpMethod.Post,
      handler: this.addFavorite,
      middlewares: [
        new PrivateRouteMiddleware(),
        new ValidateObjectIdMiddleware('offerId'),
        new DocumentExistsMiddleware(this.offerService, 'Offer', 'offerId'),
      ],
    });
    this.addRoute({
      path: '/favorites/:offerId',
      method: HttpMethod.Delete,
      handler: this.removeFavorite,
      middlewares: [
        new PrivateRouteMiddleware(),
        new ValidateObjectIdMiddleware('offerId'),
        new DocumentExistsMiddleware(this.offerService, 'Offer', 'offerId'),
      ],
    });
  }

  public async create(
    { body }: CreateUserRequest,
    res: Response,
  ): Promise<void> {
    const existsUser = await this.userService.findByEmail(body.email);

    if (existsUser) {
      throw new HttpError(
        StatusCodes.CONFLICT,
        `User with email «${body.email}» exists.`,
        'UserController'
      );
    }

    const result = await this.userService.create(body, this.configService.get('SALT'));
    this.created(res, fillDTO(UserRDO, result));
  }

  public async login(
    { body }: LoginUserRequest,
    res: Response,
  ): Promise<void> {
    const user = await this.authService.verify(body);
    const token = await this.authService.authenticate(user);
    const responseData = fillDTO(LoggedUserRDO, {
      email: user.email,
      token,
    });
    this.ok(res, responseData);
  }

  public async checkAuthenticate({ tokenPayload }: Request, res: Response) {
    const foundedUser = await this.userService.findByEmail(tokenPayload.email);
    this.ok(res, fillDTO(UserRDO, foundedUser));
  }


  public async uploadAvatar({ tokenPayload, file }: Request, res: Response) {
    await this.userService.updateById(tokenPayload.id, { email: tokenPayload.email, avatar: file?.filename });
    this.created(res, fillDTO(UploadUserAvatarRDO, { filepath: file?.filename }));
  }

  public async showFavorites({ tokenPayload }: Request, res: Response): Promise<void> {
    const result = await this.userService.findFavorites(tokenPayload.id);
    this.ok(res, fillDTO(ShortOfferRDO, result));
  }

  public async addFavorite({ params, tokenPayload }: Request<ParamOfferId>, res: Response): Promise<void> {
    const isExist = await this.userService.isFavoriteExist(tokenPayload.id, params.offerId);

    if (isExist) {
      throw new HttpError(
        StatusCodes.CONFLICT,
        `Offer ${params.offerId} is already in favorites`,
        'UserController',
      );
    }

    const result = await this.userService.addFavorite(tokenPayload.id, params.offerId);
    this.noContent(res, result);
  }

  public async removeFavorite({ params, tokenPayload }: Request<ParamOfferId>, res: Response): Promise<void> {
    const result = await this.userService.removeFavorite(tokenPayload.id, params.offerId);
    this.noContent(res, result);
  }
}
