import { createHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { winnerSchema } from '../../../utils/validation'

export default createHandler(schema.winners, winnerSchema)
