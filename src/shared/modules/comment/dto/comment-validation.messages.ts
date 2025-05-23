import { COMMENT_LIMIT } from '../comment-limit.constant.js';

export const COMMENT_VALIDATION_MESSAGES = {
  TEXT: {
    MIN_LENGTH: `minimum comment length is ${COMMENT_LIMIT.TEXT.MIN_LENGTH}`,
    MAX_LENGTH: `maximum comment length is ${COMMENT_LIMIT.TEXT.MAX_LENGTH}`
  },
  RATING: {
    MIN_VALUE: `minimum rating is ${COMMENT_LIMIT.RATING.MIN}`,
    MAX_VALUE: `maximum rating is ${COMMENT_LIMIT.RATING.MAX}`,
    INVALID_FORMAT: 'rating must be an integer',
  }
} as const;
