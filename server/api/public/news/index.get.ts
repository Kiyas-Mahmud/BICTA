import { getPublishedNews } from '../../../utils/queries'

export default defineEventHandler(() => getPublishedNews())
