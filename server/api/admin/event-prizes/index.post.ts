import { createHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { eventPrizeSchema } from '../../../utils/validation'

export default createHandler(schema.eventPrizes, eventPrizeSchema)
