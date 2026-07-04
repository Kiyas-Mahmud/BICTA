import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { checkpointSchema } from '../../../utils/validation'

export default updateHandler(schema.checkpoints, schema.checkpoints.id, checkpointSchema)
