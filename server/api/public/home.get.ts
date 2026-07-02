import {
  getCurrentEventFull,
  getPublishedNews,
  getPastEvents,
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
  const [current, news, pastEvents, settings, features, sponsors, people, winners, faqs, testimonials, steps] =
    await Promise.all([
      getCurrentEventFull(),
      getPublishedNews(5),
      getPastEvents(),
      getSettings(),
      getHomeFeatures(),
      getSponsors(),
      getPeople(),
      getWinners(),
      getFaqs(),
      getTestimonials(),
      getHowItWorksSteps(),
    ])

  const timeline = current ? getTimeline(current.id) : []
  const gallery = current ? getEventGallery(current.id) : []
  const judges = people.filter((p) => p.role === 'judge')
  const speakers = people.filter((p) => p.role === 'speaker')

  return {
    current,
    news,
    pastEvents,
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
