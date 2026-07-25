import {
  getCurrentEventFull,
  getPublishedNews,
  getSettings,
  getHomeFeatures,
  getTimeline,
  getSponsors,
  getPeople,
  getWinners,
  getFaqs,
  getEventGallery,
  getTestimonials,
  getHowItWorksSteps,
} from '../../utils/queries'

export default defineEventHandler(async () => {
  const [current, news, settings, features, sponsors, people, winners, faqs, testimonials, steps] =
    await Promise.all([
      getCurrentEventFull(),
      getPublishedNews(5),
      getSettings(),
      getHomeFeatures(),
      getSponsors(),
      getPeople(),
      getWinners(),
      getFaqs(),
      getTestimonials(),
      getHowItWorksSteps(),
    ])

  const [timeline, gallery] = await Promise.all([
    current ? getTimeline(current.id) : [],
    current ? getEventGallery(current.id) : [],
  ])
  const judges = people.filter((p) => p.role === 'judge')
  const speakers = people.filter((p) => p.role === 'speaker')

  return {
    current,
    news,
    settings,
    features,
    timeline,
    sponsors,
    judges,
    speakers,
    winners,
    faqs,
    gallery,
    testimonials,
    steps,
  }
})
