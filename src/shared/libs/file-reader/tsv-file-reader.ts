import EventEmitter from 'node:events';
import { createReadStream } from 'node:fs';

import { FileReader } from './file-reader.interface.js';
import {Offer, User} from '../../types/index.js';
import { CityName } from '../../types/index.js';
import { Accommodation } from '../../types/index.js';
import { UserType } from '../../types/index.js';


const DECIMAL = 10;
const NEWLINE = '\n';
const TAB = '\t';
const SEPARATOR = ';';


export class TSVFileReader extends EventEmitter implements FileReader {
  private CHUNK_SIZE = 16384;

  constructor(
    private readonly filename: string
  ) {
    super();
  }


  private parseLineToOffer(line: string): Offer {
    const [
      title,
      description,
      createdDate,
      city,
      preview,
      images,
      isPremium,
      isFavorite,
      rating,
      accommodation,
      rooms,
      guests,
      price,
      amenities,
      host,
      commentsCount,
      location,
    ] = line.split(TAB);

    return {
      title,
      description,
      date: new Date(createdDate),
      city: CityName[city as 'Paris'| 'Cologne' | 'Brussels' | 'Amsterdam' | 'Hamburg' | 'Dusseldorf'],
      preview,
      images: this.parseToArray(images),
      isPremium: this.parseBoolean(isPremium),
      isFavorite: this.parseBoolean(isFavorite),
      rating: this.parseToNum(rating),
      accommodation: Accommodation[accommodation as 'apartment' | 'house' | 'room' | 'hotel'],
      rooms: this.parseToNum(rooms),
      guests: this.parseToNum(guests),
      price: this.parseToNum(price),
      amenities: this.parseToArray(amenities),
      host: this.parseHost(host),
      commentsCount: this.parseToNum(commentsCount),
      location: {
        latitude: Number(this.parseToArray(location)[0]),
        longitude: Number(this.parseToArray(location)[1]),
      },
    };
  }

  private parseBoolean(string: string): boolean {
    return string === 'true';
  }

  private parseUserType(string: string): UserType {
    return string === UserType.Pro ? UserType.Pro : UserType.Regular;
  }

  private parseToArray<T> (string: string): T[] {
    return string.split(SEPARATOR).map((name) => name as T);
  }

  private parseHost(string: string): User {
    const [name, email, avatar, password, userType] = this.parseToArray<string>(string);
    const type = this.parseUserType(userType);
    return {name, email, avatar, password, type};
  }

  private parseToNum (dataString: string): number {
    return Number.parseInt(dataString, DECIMAL);
  }

  public async read(): Promise<void> {
    const readStream = createReadStream(this.filename, {
      highWaterMark: this.CHUNK_SIZE,
      encoding: 'utf-8',
    });

    let remainingData = '';
    let nextLinePosition = -1;
    let importedRowCount = 0;

    for await (const chunk of readStream) {
      remainingData += chunk.toString();

      while ((nextLinePosition = remainingData.indexOf(NEWLINE)) >= 0) {
        const completeRow = remainingData.slice(0, nextLinePosition + 1);
        remainingData = remainingData.slice(++nextLinePosition);
        importedRowCount++;

        const parsedOffer = this.parseLineToOffer(completeRow);
        this.emit('line', parsedOffer);
      }
    }

    this.emit('end', importedRowCount);
  }

}
