(function(){
  'use strict';

  // Fallback canon in case /data/site.json is unavailable.
  const FALLBACK = {
    meta: { cycle: '2999.09' },
    facts: {
      founded: 2041,
      present_year: 2999,
      active_meters: 214116882,
      read_interval_seconds: 4,
      estimated_reads_since_founding: 0,
      energy_consumption: { yottajoules_per_41_days: 1 },
      regulator: 'Joint Settlement Authority Ceres',
      payment_route: 'ISP-2041'
    },
    mix: {
      the_beam: { label: 'The Beam', value: 46, color: '#ff3ea5', source: 'relayed Mercury sunlight' },
      fusion: { label: 'Fusion', value: 31, color: '#35e0e0', source: 'Ceres, Callisto, 11 licensed hulls' },
      moontide: { label: 'Moontide', value: 14, color: '#d8e838', source: 'Europa flex' },
      stored_light: { label: 'Stored light', value: 9, color: '#ff7a1a', source: 'flywheels, mass batteries' }
    },
    rates: {
      porchlight: { sunward: 0.0042, shade: 0.0114, unit: 'credits/MJ', for: 'household structures' },
      corner_main: { sunward: 0.0061, shade: 0.0138, unit: 'credits/MJ', for: 'commercial structures' },
      underway: { flat: 0.0088, unit: 'credits/MJ', for: 'ships and tugs' },
      first_light: { note: 'read not billed for first 3 cycles', for: 'new settlements' }
    },
    accounts: [
      { id: 'ISP-000000112', name: 'Meter 112', location: 'Earth Reserve Ohio', status: 'active', note: 'oldest account' },
      { id: 'ISP-TR4-NS-001', name: 'New Sheboygan', location: 'Tow Route 4', status: 'current' },
      { id: 'ISP-TR4-HG-044', name: 'Halverson Green', location: 'Tow Route 4', status: 'current' },
      { id: 'ISP-EU-AUTONOMOUS', name: 'Europa Autonomous Grid', location: 'Europa', status: 'autonomous', note: 'pays own bill since 2093' },
      { id: 'ISP-BELT-UNPAID', name: 'Belt households', location: 'Asteroid Belt', status: 'delinquent', note: 'unpaid since 2087' }
    ],
    routes: [
      { id: 'TR-4', name: 'Tow Route 4', places: ['New Sheboygan', 'Halverson Green'], status: 'current' },
      { id: 'PI-1', name: 'Phobos Interchange', places: ['transfer node', 'beamline terminus'], status: 'settled' }
    ],
    timelines: [
      { year: 2041, event: 'In-Space Power founded' },
      { year: 2087, event: 'Belt households last paid' },
      { year: 2091, event: 'Meter 112 activated' },
      { year: 2093, event: 'Europa began paying its own bill' },
      { year: 2709, event: 'Halverson Green joined Tow Route 4' },
      { year: 2711, event: 'New Sheboygan joined Tow Route 4' }
    ],
    personas: [
      { id: 'isp-reyes', name: 'Mara Reyes', type: 'staff', role: 'Dispatch Principal', voice: 'Routing-table calm. Posts only what has already been metered.', traits: ['no adjectives', 'quotes figures to four places', 'answers complaints with tables'], stance: 'The grid is a promise with a timestamp.', first_seen: '2055.02' },
      { id: 'isp-okafor', name: 'Tobenna Okafor', type: 'staff', role: 'Chief Read Office', voice: 'A read is a read. Says it the way other people say amen.', traits: ['counts in public', 'never rounds', 'offended by estimates'], stance: 'If it was not read, it did not happen.', first_seen: '2078.11' },
      { id: 'isp-vale', name: 'Istvan Vale', type: 'staff', role: 'Beamline Operations', voice: 'Terse. Believes adjectives cause faults.', traits: ['all-caps in person, lowercase in print', 'names beamlines after grandmothers'], stance: 'The Beam does not negotiate.', first_seen: '2063.07' },
      { id: 'isp-chen', name: 'Lena Chen', type: 'staff', role: 'Tariff and Rates Desk', voice: 'Apologetic precision. Says "regrettably" about arithmetic.', traits: ['rounds down when ashamed', 'footnotes her own apologies'], stance: 'A rate is a story we tell about scarcity.', first_seen: '2098.04' },
      { id: 'isp-aba', name: 'Dawit Aba', type: 'staff', role: 'Settlement Clerk', voice: 'Dry enough to preserve fruit. Finds the Belt situation funny.', traits: ['has never lost a ledger argument', 'files jokes under "miscellaneous"'], stance: 'Every debt is a relationship.', first_seen: '2101.09' },
      { id: 'isp-sow', name: 'Priya Sow', type: 'staff', role: 'Meter Counsel', voice: 'Reads contracts aloud for pleasure.', traits: ['cites clause numbers from memory', 'bills by the sub-clause'], stance: 'A meter is bonded to the structure, not the story.', first_seen: '2120.01' },
      { id: 'nsheb-desk', name: 'New Sheboygan Ordinance Desk', type: 'community', role: 'Town in tow, Tow Route 4', voice: 'Proud and homesick in the same sentence.', traits: ['keeps a lawn under yard glass', 'records sermons against drift'], stance: 'We are not cargo. We are a town that happens to be moving.', first_seen: '2711.03' },
      { id: 'hg-brandt', name: 'Mayor Ila Brandt', type: 'community', role: 'Mayor, Halverson Green', voice: 'Steeple-first rhetoric.', traits: ['the steeple is load-bearing, spiritually', 'has opinions about shade rates'], stance: 'A town is its steeple, its water tower, and its bill.', first_seen: '2709.06' },
      { id: 'belt-roundtable', name: 'Belt Debtors\' Roundtable', type: 'community', role: 'Unpaid households, Asteroid Belt', voice: 'Cheerful defiance. Throws better parties than the utility.', traits: ['unpaid since 2087, unbothered', 'quotes the founding charter back at us'], stance: 'Send a reader. We will feed them.', first_seen: '2087.10' },
      { id: 'europa-envoy', name: 'Envoy of the Europa Autonomous Grid', type: 'community', role: 'Self-paying grid since 2093', voice: 'Smug courtesy, immaculately punctual.', traits: ['pays early', 'sends thank-you notes to the meter'], stance: 'Autonomy is just punctuality at scale.', first_seen: '2093.12' },
      { id: 'tug-rusk', name: 'Captain Rusk, tug Cordial', type: 'community', role: 'Tow-chain haulage', voice: 'Rope-and-coffee philosophy.', traits: ['has towed three towns', 'names every house he hauls'], stance: 'The towns are the only cargo that waves back.', first_seen: '2690.08' },
      { id: 'shade-broker', name: 'A Shade Broker on Ceres', type: 'community', role: 'Stored-light futures', voice: 'Market gossip with a spreadsheet heart.', traits: ['prices the observance night by the kilosecond', 'never sleeps in the shade'], stance: 'Celebration is demand wearing its good coat.', first_seen: '2830.05' },
      { id: 'the-record', name: 'The Record (canon editors)', type: 'canon', role: 'Correction to the company\'s own record', voice: 'Third person, present tense, no mercy.', traits: ['corrects adjectives first', 'keeps the receipts since 2041'], stance: 'The record is the only speaker that never lies.', first_seen: '2041.01' },
      { id: 'jsac-footnotes', name: 'Footnote Desk, JSAC', type: 'canon', role: 'Regulator corrections', voice: 'A regulator with a red pencil and a waiting room.', traits: ['every correction is numbered', 'has corrected the corrections'], stance: 'Precision is a form of patience.', first_seen: '2043.02' },
      { id: 'archivist', name: 'The House Archivist', type: 'canon', role: 'Institutional memory', voice: 'Speaks in dates. Mourns nothing.', traits: ['knows what was never posted', 'files rumors under "weather"'], stance: 'What is not posted is not lost. It is indoors.', first_seen: '2042.07' }
    ],
    events: [
      { timestamp: '2999-09-41T02:00:00Z', persona_id: 'isp-reyes', role: 'staff', kind: 'statement', title: 'Notice 2999-09-1170: register your illumination for the 3K observance', body: 'In this final cycle before the year 3000, structures are invited to register planned illumination displays for the crossing. Reads continue at four seconds throughout. The Beam does not take holidays, and neither do the readers.', tags: ['3k', 'observance', 'the beam'] },
      { timestamp: '2999-09-41T05:22:00Z', persona_id: 'isp-okafor', role: 'staff', kind: 'statement', title: 'Read schedule through the millennium crossing', body: 'The crossing into the year 3000 will be metered like any other second, which is to say exactly. No structure will be uncounted at midnight of the new era. A read is a read.', tags: ['reads', '3k'] },
      { timestamp: '2999-09-40T11:03:00Z', persona_id: 'the-record', role: 'canon', kind: 'footnote', title: 'Correction: "nearly a thousand years" is 958 years', body: 'The Record corrects a company statement describing the service interval as "nearly a thousand years." The interval is 958 years. Precision is a form of respect.', tags: ['correction', 'the record'] },
      { timestamp: '2999-09-39T09:47:00Z', persona_id: 'belt-roundtable', role: 'community', kind: 'complaint', title: 'Third disconnect notice this cycle', body: 'The Roundtable acknowledges the third disconnect notice of the cycle. The first was framed. The second is a coaster. The third is answered with soup; the reader who delivers it will be fed regardless of what the notice says.', tags: ['belt', 'disconnects'] },
      { timestamp: '2999-09-38T14:20:00Z', persona_id: 'isp-chen', role: 'staff', kind: 'acknowledgment', title: 'Correction to the printed shade rate', body: 'The shade rate printed at 0.0114 was in effect 0.0113 for the first nine days of the cycle. The difference, 0.0001 per megajoule, will be credited to affected structures. Regrettably.', tags: ['tariffs', 'shade', 'correction'] },
      { timestamp: '2999-09-37T20:11:00Z', persona_id: 'nsheb-desk', role: 'community', kind: 'comment', title: 'New Sheboygan registers its yard-glass lights', body: 'The town will run its lawn glass at full color for the crossing. The Ordinance Desk confirms the displays are registered under Notice 2999-09-1170, and that the sermon against drift will pause for one night only.', tags: ['3k', 'tow route 4'] },
      { timestamp: '2999-09-36T07:58:00Z', persona_id: 'hg-brandt', role: 'community', kind: 'complaint', title: 'The steeple meter reads our rotation as enthusiasm', body: 'Meter counsel reminds me the meter is bonded to the church steeple, as is right. But when the chain rotates the town for an even bake, the steeple describes a circle and the meter reads the circle as consumption. Bill the geometry, not the faithful.', tags: ['halverson green', 'meter bonding'] },
      { timestamp: '2999-09-35T16:44:00Z', persona_id: 'tug-rusk', role: 'community', kind: 'comment', title: 'Cordial reports: New Sheboygan is waving', body: 'Tug Cordial hauled the chain through the Phobos Interchange today. New Sheboygan waved. They always wave. It is the only cargo that waves back, and I have hauled three towns.', tags: ['tow route 4', 'phobos interchange'] },
      { timestamp: '2999-09-34T03:31:00Z', persona_id: 'europa-envoy', role: 'community', kind: 'statement', title: 'Europa settles its millennium-cycle bill early', body: 'The Europa Autonomous Grid has paid its cycle 2999.10 invoice eleven cycles in advance. Punctuality is not a gesture. It is a habit.', tags: ['europa', 'settlement'] },
      { timestamp: '2999-09-33T12:15:00Z', persona_id: 'jsac-footnotes', role: 'canon', kind: 'footnote', title: 'Regulator correction: observance cost estimate', body: 'Footnote 1188: the company\'s estimate of observance illumination cost omitted stored-light carry. The corrected figure is published separately. JSAC thanks the broker who noticed.', tags: ['jsac', '3k', 'correction'] },
      { timestamp: '2999-09-32T19:02:00Z', persona_id: 'shade-broker', role: 'community', kind: 'comment', title: 'Stored light firms ahead of the observance night', body: 'Futures in stored light are firm. Everyone wants their midnight bright, and midnight, it turns out, is on the shade side of the planet. Celebration is demand wearing its good coat.', tags: ['shade', 'markets', '3k'] },
      { timestamp: '2999-09-31T04:26:00Z', persona_id: 'isp-vale', role: 'staff', kind: 'statement', title: 'Beamline maintenance window, cycle 2999.10', body: 'Beamline B takes a maintenance window during the observance. Fusion holds the base. Nobody panic in an organized manner.', tags: ['the beam', 'maintenance'] },
      { timestamp: '2999-09-30T10:49:00Z', persona_id: 'nsheb-desk', role: 'community', kind: 'complaint', title: 'Tow surcharge questioned again', body: 'The Ordinance Desk notes that being towed is not a lifestyle and objects to the underway surcharge applied while the town sleeps through haulage. We did not book this trip.', tags: ['tariffs', 'tow route 4'] },
      { timestamp: '2999-09-29T15:37:00Z', persona_id: 'isp-aba', role: 'staff', kind: 'acknowledgment', title: 'On the Belt balance', body: 'Settlement acknowledges the Roundtable\'s offer of soup. Soup is not a payment instrument. The balance stands, as it has since 2087, unblinking.', tags: ['belt', 'settlement'], caused_by: 'Third disconnect notice this cycle' },
      { timestamp: '2999-09-28T08:14:00Z', persona_id: 'isp-sow', role: 'staff', kind: 'statement', title: 'Reminder: meters move with the structure', body: 'As tow season resumes: a meter is bonded to a structure, not to an address, a planet, or a sentiment. When your house moves, your meter moves, your history moves, and your bill finds you. This is not a threat. It is clause 4.', tags: ['meter bonding', 'tow routes'] },
      { timestamp: '2999-09-27T17:53:00Z', persona_id: 'archivist', role: 'canon', kind: 'comment', title: 'On what was never posted', body: 'The House notes, for the curious, that the archive holds considerably more than the kiosk does. What is not posted is not lost. It is indoors.', tags: ['archive', 'the record'] },
      { timestamp: '2999-09-26T06:29:00Z', persona_id: 'hg-brandt', role: 'community', kind: 'complaint', title: 'Shade rate under the eclipse window', body: 'Halverson Green objects to shade pricing during the eclipse window. Stored light is dear because it has been carried, we are told. So has our town. Carrying is not a new concept here.', tags: ['shade', 'tariffs'], caused_by: 'Correction to the printed shade rate' },
      { timestamp: '2999-09-25T13:41:00Z', persona_id: 'isp-reyes', role: 'staff', kind: 'statement', title: 'Statement cycle 2999.09 closes on schedule', body: 'Cycle 2999.09 closes at the end of day 41. Figures hereafter belong to 2999.10 and to the new era. The company thanks the 214 million structures that kept their meters honest this cycle.', tags: ['cycle', 'statement'] },
      { timestamp: '2999-09-24T09:18:00Z', persona_id: 'the-record', role: 'canon', kind: 'footnote', title: 'Correction: licensed hulls, eleven, not twelve', body: 'The Record corrects the generation mix legend: licensed fusion hulls number eleven, not twelve. The twelfth is a restaurant. It has been removed from the mix and returned to dinner.', tags: ['correction', 'fusion', 'the record'] },
      { timestamp: '2999-09-23T21:05:00Z', persona_id: 'belt-roundtable', role: 'community', kind: 'comment', title: 'The soup invitation stands', body: 'The Roundtable confirms the soup invitation is annual, structural, and sincere. Send a reader. We will feed them. Settlement knows where to find us; it has the notices framed.', tags: ['belt'], caused_by: 'On the Belt balance' },
      { timestamp: '2999-09-22T11:52:00Z', persona_id: 'isp-okafor', role: 'staff', kind: 'acknowledgment', title: 'On the estimated-reads counter', body: 'The counter of estimated reads since 2041 has been checked against the ledger and found to be within acceptable awe. It will continue to count. That is what it is for.', tags: ['reads'] },
      { timestamp: '2999-09-21T02:37:00Z', persona_id: 'nsheb-desk', role: 'community', kind: 'complaint', title: 'Sermon against drift interrupted by flex', body: 'The Ordinance Desk complains that Moontide flex interrupted Tuesday\'s sermon against drift at the good part. Europa flexes; we forgive; the lawn glass rippled beautifully. Note it, but gently.', tags: ['moontide', 'tow route 4'] },
      { timestamp: '2999-09-20T18:46:00Z', persona_id: 'europa-envoy', role: 'community', kind: 'comment', title: 'On punctuality at the crossing', body: 'The Grid will observe the crossing by keeping its usual schedule, one hour earlier than everyone\'s, as is tradition since 2093. Autonomy is punctuality at scale.', tags: ['europa', '3k'] },
      { timestamp: '2999-09-19T07:20:00Z', persona_id: 'isp-reyes', role: 'staff', kind: 'statement', title: 'On the year 3000', body: 'The company has been asked what changes at the year 3000. The answer is filing-structural and spiritual: nothing. Rates hold. Reads continue. The millennium will be metered like any other second. Exactly.', tags: ['3k', 'statement'] },
      { timestamp: '2999-09-41T03:12:00Z', persona_id: 'isp-vale', role: 'staff', kind: 'memo', audience: 'internal', title: 'Shift handoff: Beamline B', body: 'Flex reserve holding at 6%. [REDACTED: house figure] Do not post. The kiosk hears about faults only after they are grandmothers.', tags: ['handoff', 'beamline'] },
      { timestamp: '2999-09-40T22:48:00Z', persona_id: 'isp-chen', role: 'staff', kind: 'memo', audience: 'internal', title: 'Draft apology, shade misprint: held', body: 'Draft "we regret" language for the shade-rate misprint. Held at counsel\'s advice: an apology is an admission with a postage stamp. [REDACTED]', tags: ['drafts', 'tariffs'] },
      { timestamp: '2999-09-40T16:03:00Z', persona_id: 'isp-aba', role: 'staff', kind: 'memo', audience: 'internal', title: 'Re: Belt, 2087, again', body: 'They offered to feed the reader. That is not payment; that is a restaurant. Hold the line. Concede nothing in public. [REDACTED]', tags: ['belt', 'settlement'] },
      { timestamp: '2999-09-39T05:35:00Z', persona_id: 'isp-reyes', role: 'staff', kind: 'memo', audience: 'internal', title: 'Observance staffing, 2999-10', body: 'Triple read shift at the Phobos Interchange for the crossing. Company position, and I quote: the year 3000 is a billing year like any other. No free light. [REDACTED]', tags: ['3k', 'staffing'] },
      { timestamp: '2999-09-38T13:19:00Z', persona_id: 'the-record', role: 'canon', kind: 'memo', audience: 'internal', title: 'Held: correction re: founding charter', body: 'A correction touching the founding charter is held pending [REDACTED]. The Record does not enjoy holding. The Record holds.', tags: ['the record', 'holds'] },
      { timestamp: '2999-09-37T10:26:00Z', persona_id: 'isp-sow', role: 'staff', kind: 'memo', audience: 'internal', title: 'The kiosk posted it; it stands', body: 'Legal notes the kiosk posted the tow-route ledger item before this office approved the wording. Too late. Posted is posted. [REDACTED]', tags: ['kiosk', 'legal'] },
      { timestamp: '2999-09-36T15:44:00Z', persona_id: 'isp-okafor', role: 'staff', kind: 'memo', audience: 'internal', title: 'The waving is not a fault', body: 'Captain Rusk waves at the towed towns and the towns wave back. Not a meter fault. No ticket. [REDACTED] Someone should tell him the gesture is logged.', tags: ['reads', 'tow routes'] },
      { timestamp: '2999-09-35T19:57:00Z', persona_id: 'archivist', role: 'canon', kind: 'memo', audience: 'internal', title: 'Weather (rumors)', body: 'Rumor logged: that the illumination registry is a census of the willing. Filed under weather. [REDACTED]', tags: ['archive', '3k'] },
      { timestamp: '2999-09-41T04:00:04Z', persona_id: 'isp-okafor', role: 'staff', kind: 'log', audience: 'internal', title: 'AUTOREAD: Phobos Interchange watch', body: '2999-09-41T04:00:04Z METER 18822041 READ OK\n2999-09-41T04:00:08Z METER 18822041 READ OK\n2999-09-41T04:00:12Z METER 18822041 READ OK\n[... 3,153,600 lines omitted; all OK]\n2999-09-41T07:30:00Z WATCH ENDS. NOTHING HAPPENED. LOGGED ANYWAY.', tags: ['reads', 'logs'] },
      { timestamp: '2999-09-39T22:14:00Z', persona_id: 'isp-vale', role: 'staff', kind: 'transcript', audience: 'internal', title: 'Intercepted: beamline scheduling call', body: 'VALE: The observance window overlaps my maintenance.\nREYES: Then the maintenance overlaps the observance.\nVALE: I am asking for the night.\nREYES: The night is load-bearing, Istvan.\nVALE: [unintelligible]\nREYES: Logged as agreement.', tags: ['observance', 'beamline'] },
      { timestamp: '2999-09-38T21:52:00Z', persona_id: 'isp-reyes', role: 'staff', kind: 'misdirected', audience: 'internal', title: 'Misdirected personal note', body: 'Dawit, the soup thing. If Settlement ever concedes, I want it on record that I was against the restaurant joke from the start. Also your sister says the yard glass goes up at full color for the crossing, and you are expected. Do not reply on this channel. Signed, R.', tags: ['personal', 'belt'] },
      { timestamp: '2999-09-18T06:05:00Z', persona_id: 'isp-vale', role: 'staff', kind: 'statement', title: 'Space weather: halo CME clears the Sunside tranche', body: 'A coronal mass ejection off the Sunside tranche reached the primary beamlines on day 17. The Beam was curtailed for eleven hours. Fusion held the base. Stored light filled the gap at observance prices. The Sun has issued a statement of its own. In-Space Power acknowledges receipt.', tags: ['space-weather', 'the beam', 'outage'] },
      { timestamp: '2999-09-16T11:30:00Z', persona_id: 'nsheb-desk', role: 'community', kind: 'complaint', title: 'Micrometeorite swarm over Tow Route 4', body: 'A swarm crossed the route on day 15. New Sheboygan\'s yard glass is cracked in three places, and the Ordinance Desk notes that a lawn under broken glass is a lawn under weather. Tow insurance, we have learned, covers tugs.', tags: ['tow route 4', 'yard-glass', 'impact'] },
      { timestamp: '2999-09-15T09:12:00Z', persona_id: 'isp-reyes', role: 'staff', kind: 'acknowledgment', title: 'On Tow Route 4 yard-glass damage', body: 'The company acknowledges the damage to New Sheboygan\'s yard glass. Structures under tow are metered, insured, and indemnified per clause 9. The clause is long. The crack is covered. A reader will attend.', tags: ['tow route 4', 'yard-glass'], caused_by: 'Micrometeorite swarm over Tow Route 4' },
      { timestamp: '2999-09-14T17:44:00Z', persona_id: 'isp-reyes', role: 'staff', kind: 'statement', title: 'Fire at the Vesta shade vaults', body: 'A fire in the shade-flywheel vaults at Vesta Yards on day 13 vented 40 terajoules of stored light before it was contained. Two crews were treated for light exposure and released. For six minutes, the night side of the Belt was free. Settlement is deciding whether the light was delivered, and to whom to send the bill.', tags: ['vesta', 'shade', 'fire'] },
      { timestamp: '2999-09-13T22:20:00Z', persona_id: 'the-record', role: 'canon', kind: 'footnote', title: 'Correction: "unprecedented"', body: 'The Record corrects a company draft describing the Vesta event as "unprecedented." Vault fires occurred in 2261, 2410, and twice in 2555. The word has been returned to storage.', tags: ['correction', 'the record'], caused_by: 'Fire at the Vesta shade vaults' },
      { timestamp: '2999-09-13T19:03:00Z', persona_id: 'shade-broker', role: 'community', kind: 'comment', title: 'On six free minutes', body: 'The market does not know how to price a gift. Stored-light futures dipped, recovered, and pretended nothing happened. I was watching the sky like everyone else.', tags: ['shade', 'markets', 'vesta'], caused_by: 'Fire at the Vesta shade vaults' },
      { timestamp: '2999-09-13T08:47:00Z', persona_id: 'isp-aba', role: 'staff', kind: 'memo', audience: 'internal', title: 'Re: the free light', body: 'Yes, the night was free for six minutes. No, we are not billing the sky. Inquiry closed. [REDACTED] If asked publicly, the answer is "the matter is under review." It is not under review.', tags: ['vesta', 'settlement'] }
    ],
    chains: {}
  };

  function formatNumber(n) {
    return n.toLocaleString('en-US');
  }

  function formatCredits(v) {
    return '¤' + v.toFixed(4);
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function renderChart(mix) {
    const container = document.getElementById('mixChart');
    if (!container) return;
    const data = Object.values(mix).sort((a, b) => b.value - a.value);
    const total = data.reduce((s, d) => s + d.value, 0);

    const ns = 'http://www.w3.org/2000/svg';
    const size = 400;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 160;
    const innerRadius = 96;

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

    let angle = -Math.PI / 2;
    data.forEach(item => {
      const sliceAngle = (item.value / total) * Math.PI * 2;
      const endAngle = angle + sliceAngle;

      const x1 = cx + radius * Math.cos(angle);
      const y1 = cy + radius * Math.sin(angle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);
      const ix1 = cx + innerRadius * Math.cos(angle);
      const iy1 = cy + innerRadius * Math.sin(angle);
      const ix2 = cx + innerRadius * Math.cos(endAngle);
      const iy2 = cy + innerRadius * Math.sin(endAngle);

      const largeArc = sliceAngle > Math.PI ? 1 : 0;
      const d = [
        `M ${ix1} ${iy1}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
        'Z'
      ].join(' ');

      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', item.color);
      svg.appendChild(path);

      const midAngle = angle + sliceAngle / 2;
      const labelRadius = innerRadius + (radius - innerRadius) / 2;
      const lx = cx + labelRadius * Math.cos(midAngle);
      const ly = cy + labelRadius * Math.sin(midAngle);

      const text = document.createElementNS(ns, 'text');
      text.setAttribute('x', lx);
      text.setAttribute('y', ly);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', '#16101f');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', '800');
      text.textContent = item.value + '%';
      svg.appendChild(text);

      angle = endAngle;
    });

    container.innerHTML = '';
    container.appendChild(svg);
  }

  function renderLegend(mix) {
    const container = document.getElementById('mixLegend');
    if (!container) return;
    const data = Object.values(mix).sort((a, b) => b.value - a.value);
    container.innerHTML = '';
    data.forEach(item => {
      const div = el('div', 'legend-item');
      const dt = el('dt');
      dt.innerHTML = `<span class="swatch" style="--c:${item.color}"></span>${item.label}`;
      const dd = el('dd', '', `${item.value}%, ${item.source}`);
      div.appendChild(dt);
      div.appendChild(dd);
      container.appendChild(div);
    });
  }

  function renderPlans(rates) {
    const container = document.getElementById('plans');
    if (!container) return;
    const order = ['porchlight', 'corner_main', 'underway', 'first_light'];
    const labels = {
      porchlight: 'Porchlight',
      corner_main: 'Corner Main',
      underway: 'Underway',
      first_light: 'First Light'
    };
    container.innerHTML = '';
    order.forEach(key => {
      const r = rates[key];
      if (!r) return;
      const art = el('article', key === 'first_light' ? 'plan plan-highlight' : 'plan');
      art.appendChild(el('h3', '', labels[key]));
      art.appendChild(el('p', 'plan-for', r.for));

      const rateP = el('p', 'plan-rate');
      if (r.sunward !== undefined && r.shade !== undefined) {
        rateP.innerHTML = `<span class="rate-sun">${formatCredits(r.sunward)}</span> <span class="rate-shade">${formatCredits(r.shade)}</span>`;
      } else if (r.flat !== undefined) {
        rateP.innerHTML = `<span class="rate-flat">${formatCredits(r.flat)}</span>`;
      } else if (r.note) {
        rateP.innerHTML = `<span class="rate-free">${r.note}</span>`;
      }
      art.appendChild(rateP);

      const note = key === 'first_light'
        ? 'Per MJ. For new settlements; read but not billed for the first three cycles.'
        : `Per MJ. ${r.for}.`;
      art.appendChild(el('p', 'plan-note', note));
      container.appendChild(art);
    });
  }

  function startReadsTicker(facts) {
    const readsEl = document.getElementById('estimatedReads');
    if (!readsEl) return;
    const readsPerSecond = facts.active_meters / facts.read_interval_seconds;
    const secondsElapsed = (facts.present_year - facts.founded) * 365.25 * 86400;
    let estimate = Math.floor(readsPerSecond * secondsElapsed);
    readsEl.textContent = formatNumber(estimate);
    window.setInterval(() => {
      estimate += Math.floor(readsPerSecond);
      readsEl.textContent = formatNumber(estimate);
    }, 1000);
  }

  function renderFacts(facts, timelines, personas, events) {
    const container = document.getElementById('factsGrid');
    if (!container) return;
    const yearsSince = facts.present_year - facts.founded;
    const voices = (personas || []).length;
    const posted = (events || []).filter(e => e.audience !== 'internal').length;
    const leaked = (events || []).filter(e => e.audience === 'internal').length;
    const items = [
      { num: yearsSince, label: 'years since founding' },
      { num: '3,000', label: 'the year, next cycle, observance in preparation' },
      { num: 'Meter 112', label: 'oldest account, Earth Reserve Ohio' },
      { num: '1 YJ', label: 'consumed every 41 days' },
      { num: voices, label: 'voices on record this cycle' },
      { num: posted + ' / ' + leaked, label: 'posted notices / leaked house items' },
      { num: 'JSAC', label: 'regulator, ' + facts.regulator },
      { num: '2087', label: 'Belt households unpaid since' },
      { num: '2093', label: 'Europa paying its own bill since' }
    ];
    container.innerHTML = '';
    items.forEach(item => {
      const div = el('div', 'fact');
      div.appendChild(el('span', 'fact-num', String(item.num)));
      div.appendChild(el('span', 'fact-label', item.label));
      container.appendChild(div);
    });

    // Update hero stats if elements exist
    const activeMeters = document.getElementById('activeMeters');
    if (activeMeters) activeMeters.textContent = formatNumber(facts.active_meters);
    const readInterval = document.getElementById('readInterval');
    if (readInterval) readInterval.textContent = facts.read_interval_seconds + 's';
    startReadsTicker(facts);
    const foundedYear = document.getElementById('foundedYear');
    if (foundedYear) foundedYear.textContent = String(facts.founded);
    const presentYear = document.getElementById('presentYear');
    if (presentYear) presentYear.textContent = String(facts.present_year);
  }

  function renderLedger(routes) {
    const container = document.getElementById('ledgerEntries');
    if (!container) return;
    container.innerHTML = '';
    routes.forEach(route => {
      const div = el('div', 'ledger-entry');
      div.appendChild(el('span', 'ledger-route', route.name));
      div.appendChild(el('span', 'ledger-places', route.places.join(' · ')));
      div.appendChild(el('span', 'ledger-status', route.status));
      container.appendChild(div);
    });
  }

  function kindLabel(kind) {
    const map = {
      statement: 'Official statement',
      comment: 'Comment',
      complaint: 'Complaint',
      acknowledgment: 'Acknowledgment',
      footnote: 'Correction to record',
      memo: 'Internal memo',
      transcript: 'Intercepted transcript',
      log: 'System log',
      misdirected: 'Misdirected note'
    };
    return map[kind] || kind;
  }

  const PAGE_SIZE = 5;
  const CYCLE_DAYS = 41;

  function filterFromHash() {
    const m = location.hash.match(/^#stream\/(all|staff|community|canon)$/);
    return m ? m[1] : 'all';
  }

  function renderStream(events, personas) {
    const container = document.getElementById('streamEntries');
    if (!container) return;

    const personaMap = {};
    (personas || []).forEach(p => { personaMap[p.id] = p; });

    const publicEvents = (events || []).filter(ev => ev.audience !== 'internal');
    const countEl = document.getElementById('streamCount');

    function updateCount(shown) {
      if (!countEl) return;
      countEl.textContent = publicEvents.length
        ? shown + ' of ' + publicEvents.length + ' posted notices selected for the statement'
        : '';
    }

    if (publicEvents.length === 0) {
      container.innerHTML = '<p class="stream-empty">No notices this cycle.</p>';
      updateCount(0);
      return;
    }

    const sorted = publicEvents.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const state = { filter: filterFromHash(), page: 1 };

    function entryNode(ev) {
      const persona = personaMap[ev.persona_id] || { name: ev.persona_id, type: ev.role };
      const article = el('article', `stream-entry stream-${ev.role}`);
      article.dataset.role = ev.role;

      const header = el('div', 'stream-header');
      header.appendChild(el('span', 'stream-kind', kindLabel(ev.kind)));
      header.appendChild(el('time', 'stream-time', ev.timestamp.replace('T', ' ').replace('Z', '')));
      article.appendChild(header);

      article.appendChild(el('h3', 'stream-title', ev.title));
      article.appendChild(el('p', 'stream-body', ev.body));

      const footer = el('div', 'stream-footer');
      const byline = el('span', 'stream-byline');
      byline.innerHTML = `<strong>${persona.name}</strong> <span class="stream-role">${ev.role}</span>`;
      footer.appendChild(byline);

      if (ev.caused_by) {
        footer.appendChild(el('span', 'stream-reply', `re: ${ev.caused_by}`));
      }

      const tags = el('span', 'stream-tags');
      tags.textContent = ev.tags.join(' · ');
      footer.appendChild(tags);

      article.appendChild(footer);
      return article;
    }

    const pager = document.getElementById('streamPager');

    function scrollToStream() {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      container.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }

    function renderPager(pages) {
      if (!pager) return;
      pager.innerHTML = '';
      if (pages <= 1) return;

      const newer = el('button', '', '‹ Newer');
      newer.type = 'button';
      newer.disabled = state.page <= 1;
      newer.setAttribute('aria-label', 'Newer notices');
      newer.addEventListener('click', () => { state.page -= 1; render(); scrollToStream(); });
      pager.appendChild(newer);

      pager.appendChild(el('span', 'stream-page-label', `Page ${state.page} of ${pages}`));

      const older = el('button', '', 'Older ›');
      older.type = 'button';
      older.disabled = state.page >= pages;
      older.setAttribute('aria-label', 'Older notices');
      older.addEventListener('click', () => { state.page += 1; render(); scrollToStream(); });
      pager.appendChild(older);
    }

    function render() {
      const filtered = sorted.filter(ev => state.filter === 'all' || ev.role === state.filter);
      const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      state.page = Math.min(Math.max(1, state.page), pages);
      const slice = filtered.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

      container.innerHTML = '';
      if (slice.length === 0) {
        container.appendChild(el('p', 'stream-empty', 'No notices under this filter.'));
      } else {
        slice.forEach(ev => container.appendChild(entryNode(ev)));
      }
      updateCount(filtered.length);
      renderPager(pages);
    }

    // Wire filter buttons
    document.querySelectorAll('.stream-filter').forEach(btn => {
      const active = btn.dataset.filter === state.filter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
      btn.addEventListener('click', () => {
        document.querySelectorAll('.stream-filter').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        state.filter = btn.dataset.filter;
        state.page = 1;
        history.replaceState(null, '', '#stream/' + state.filter);
        render();
      });
    });

    render();
  }

  function renderChannels(events, personas) {
    const container = document.getElementById('channelsEntries');
    if (!container) return;

    const personaMap = {};
    (personas || []).forEach(p => { personaMap[p.id] = p; });

    const internal = (events || [])
      .filter(ev => ev.audience === 'internal')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const countEl = document.getElementById('channelsCount');
    if (countEl) {
      countEl.textContent = internal.length
        ? internal.length + ' items intercepted this cycle'
        : '';
    }

    if (internal.length === 0) {
      container.innerHTML = '<p class="stream-empty">The house channels are quiet. This has never happened.</p>';
      return;
    }

    container.innerHTML = '';
    internal.forEach(ev => {
      const persona = personaMap[ev.persona_id] || { name: ev.persona_id, type: ev.role };
      const article = el('article', 'channel-entry');

      const header = el('div', 'channel-header');
      header.appendChild(el('span', 'channel-kind', kindLabel(ev.kind)));
      header.appendChild(el('span', 'channel-stamp', 'Not for the kiosk'));
      header.appendChild(el('time', 'channel-time', ev.timestamp.replace('T', ' ').replace('Z', '')));
      article.appendChild(header);

      article.appendChild(el('h3', 'channel-title', ev.title));

      const body = el('p', 'channel-body');
      if (ev.kind === 'transcript' || ev.kind === 'log' || ev.kind === 'misdirected') {
        body.classList.add('channel-body-pre');
      }
      if (ev.kind === 'log') body.classList.add('channel-log');
      ev.body.split(/\[REDACTED[^\]]*\]/).forEach((part, i, parts) => {
        body.appendChild(document.createTextNode(part));
        if (i < parts.length - 1) body.appendChild(el('span', 'channels-redact', 'REDACTED'));
      });
      article.appendChild(body);

      const footer = el('div', 'channel-footer');
      const byline = el('span');
      byline.innerHTML = `<strong>${persona.name}</strong> <span class="stream-role">${ev.role}</span>`;
      footer.appendChild(byline);
      const tags = el('span', 'channel-tags');
      tags.textContent = ev.tags.join(' · ');
      footer.appendChild(tags);
      article.appendChild(footer);

      container.appendChild(article);
    });
  }

  function renderPersonas(personas) {
    const container = document.getElementById('personasList');
    if (!container) return;
    if (!personas || personas.length === 0) {
      container.innerHTML = '<p class="stream-empty">No voices on record.</p>';
      return;
    }

    container.innerHTML = '';
    const countEl = document.getElementById('personasCount');
    if (countEl) {
      const staff = personas.filter(p => p.type === 'staff').length;
      const community = personas.filter(p => p.type === 'community').length;
      const canon = personas.filter(p => p.type === 'canon').length;
      countEl.textContent = `${personas.length} voices on record: ${staff} staff, ${community} community, ${canon} canon`;
    }
    personas.forEach(p => {
      const art = el('article', 'persona-card');
      const typeClass = `persona-type persona-${p.type}`;
      art.innerHTML = `
        <h3>${p.name}</h3>
        <p class="${typeClass}">${p.type}</p>
        <p class="persona-role">${p.role}</p>
        <p class="persona-voice">${p.voice}</p>
        <ul class="persona-traits">
          ${(p.traits || []).map(t => `<li>${t}</li>`).join('')}
        </ul>
        <p class="persona-stance">Stance: ${p.stance}</p>
        <p class="persona-seen">First seen ${p.first_seen}</p>
      `;
      container.appendChild(art);
    });
  }

  function renderCycle(meta, events) {
    const cycle = (meta && meta.cycle) || FALLBACK.meta.cycle;
    const cycleTime = document.getElementById('cycleTime');
    if (cycleTime) {
      cycleTime.textContent = cycle;
      cycleTime.setAttribute('datetime', cycle);
    }
    const cycleDay = document.getElementById('cycleDay');
    if (cycleDay && events && events.length) {
      const latest = events.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
      const m = latest.timestamp.match(/-(\d+)T/);
      if (m) cycleDay.textContent = ' · day ' + parseInt(m[1], 10) + ' of ' + CYCLE_DAYS;
    }
    // Keep page title and meta description in sync if they still contain a cycle string.
    const title = document.querySelector('title');
    if (title) title.textContent = title.textContent.replace(/Statement Cycle\s+[\d.]+/, 'Statement Cycle ' + cycle);
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = desc.content.replace(/Present statement cycle\s+[\d.]+/, 'Present statement cycle ' + cycle);
    document.querySelectorAll('p').forEach(p => {
      if (p.textContent.includes('Statement cycle ')) {
        p.textContent = p.textContent.replace(/Statement cycle\s+[\d.]+/, 'Statement cycle ' + cycle);
      }
    });
  }

  function init(data) {
    renderCycle(data.meta || FALLBACK.meta, data.events || FALLBACK.events);
    renderChart(data.mix || FALLBACK.mix);
    renderLegend(data.mix || FALLBACK.mix);
    renderPlans(data.rates || FALLBACK.rates);
    renderFacts(data.facts || FALLBACK.facts, data.timelines || FALLBACK.timelines, data.personas || FALLBACK.personas, data.events || FALLBACK.events);
    renderLedger(data.routes || FALLBACK.routes);
    renderStream(data.events || FALLBACK.events, data.personas || FALLBACK.personas);
    renderChannels(data.events || FALLBACK.events, data.personas || FALLBACK.personas);
    renderPersonas(data.personas || FALLBACK.personas);
  }

  // Fetch live data shard; fallback if missing or fails.
  fetch('/data/site.json')
    .then(r => r.ok ? r.json() : Promise.reject(new Error('status ' + r.status)))
    .then(data => init(data))
    .catch(err => {
      console.warn('Could not load /data/site.json, using fallback.', err);
      init(FALLBACK);
    });
})();
