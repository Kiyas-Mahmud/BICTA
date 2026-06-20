import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { winnerSchema } from '../../../utils/validation'

export default updateHandler(schema.winners, schema.winners.id, winnerSchema)
