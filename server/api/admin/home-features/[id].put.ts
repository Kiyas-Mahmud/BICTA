import { updateHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { homeFeatureSchema } from '../../../utils/validation'

export default updateHandler(schema.homeFeatures, schema.homeFeatures.id, homeFeatureSchema)
