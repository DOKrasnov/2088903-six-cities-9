import { Command } from './command.interface.js';
import { TSVFileReader } from '../../shared/libs/file-reader/index.js';
import { Offer } from '../../shared/types/index.js';
import { getErrorMessage, getMongoURI } from '../../shared/helpers/index.js';
import { UserService } from '../../shared/modules/user/index.js';
import { DefaultOfferService, OfferModel, OfferService } from '../../shared/modules/offer/index.js';
import { DatabaseClient, MongoDatabaseClient } from '../../shared/libs/database-client/index.js';
import { Logger } from '../../shared/libs/logger/index.js';
import { ConsoleLogger } from '../../shared/libs/logger/console.logger.js';
import { DefaultUserService, UserModel } from '../../shared/modules/user/index.js';

const DEFAULT_USER_PASSWORD = '123456';

export class ImportCommand implements Command {
  private readonly userService: UserService;
  private readonly offerService: OfferService;
  private readonly databaseClient: DatabaseClient;
  private readonly logger: Logger;
  private salt: string;

  constructor () {
    this.onImportedOffer = this.onImportedOffer.bind(this);
    this.onCompleteImport = this.onCompleteImport.bind(this);

    this.logger = new ConsoleLogger();
    this.offerService = new DefaultOfferService(this.logger, OfferModel);
    this.userService = new DefaultUserService(this.logger, UserModel, this.offerService);
    this.databaseClient = new MongoDatabaseClient(this.logger);
  }

  public getName(): string {
    return '--import';
  }

  public async execute (filename: string, login: string, password: string, host: string, dbport: string, dbname: string, salt: string): Promise<void> {
    const uri = getMongoURI(login, password, host, dbport, dbname);
    this.salt = salt;

    await this.databaseClient.connect(uri);

    const fileReader = new TSVFileReader(filename.trim());

    fileReader.on('line', this.onImportedOffer);
    fileReader.on('end', this.onCompleteImport);

    try {
      fileReader.read();
    } catch (err) {
      console.error(`Can't import data from file ${filename}`);
      console.error(getErrorMessage(err));
    }
  }

  private async onImportedOffer (offer: Offer, resolve: () => void) {
    await this.saveOffer(offer);
    resolve();
  }

  private async saveOffer(offer: Offer) {
    const user = await this.userService.findOrCreate(
      Object.assign(offer.host, { password: DEFAULT_USER_PASSWORD }),
      this.salt
    );

    await this.offerService.create({
      title: offer.title,
      description: offer.description,
      city: offer.city,
      preview: offer.preview,
      images: offer.images,
      isPremium: offer.isPremium,
      rating: offer.rating,
      accommodation: offer.accommodation,
      rooms: offer.rooms,
      guests: offer.guests,
      price: offer.price,
      amenities: offer.amenities,
      userId: user.id,
      commentsCount: offer.commentsCount,
      location: offer.location,
    });
  }

  private onCompleteImport (count: number) {
    console.info(`${count} rows imported.`);
    this.databaseClient.disconnect();
  }
}
