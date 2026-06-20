import { createHandler } from '../../../utils/crud'
import { schema } from '../../../database/client'
import { homeFeatureSchema } from '../../../utils/validation'

export default createHandler(schema.homeFeatures, homeFeatureSchema)
