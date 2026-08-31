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
  getHowItWorksSteps,
  getEventStats,
  getAdvisors,
} from '../../utils/queries'

export default defineEventHandler(async () => {
  const [current, news, settings, features, people, winners, faqs, steps, advisors] =
    await Promise.all([
      getCurrentEventFull(),
      getPublishedNews(5),
      getSettings(),
      getHomeFeatures(),
      getPeople(),
      getWinners(),
      getFaqs(),
      getHowItWorksSteps(),
      getAdvisors(),
    ])

  // Sponsors, timeline, gallery and stats all hang off the current event, so
  // they wait for it rather than joining the first batch.
  const [timeline, gallery, sponsors, stats] = await Promise.all([
    current ? getTimeline(current.id) : [],
    current ? getEventGallery(current.id) : [],
    getSponsors(current?.id),
    current ? getEventStats(current.id) : { participants: 0, teams: 0, universities: 0 },
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
    steps,
    stats,
    advisors,
  }
})
