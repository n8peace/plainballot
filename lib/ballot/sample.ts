// A fictional ballot used for local development, demos, and whenever live
// ballot lookup isn't configured. Every name, office and record here is made up.

import type { IssueId, Position } from '../issues';
import type { Ballot, Choice, Stance } from '../types';

type Raw = Partial<Record<IssueId, [Position, string]>>;

const choice = (name: string, party: string | undefined, raw: Raw): Choice => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  party,
  stances: Object.fromEntries(
    Object.entries(raw).map(([id, [pos, text]]) => [id, { pos, text } satisfies Stance]),
  ),
});

export const SAMPLE_BALLOT: Ballot = {
  electionName: 'General Election',
  electionDate: '2026-11-03',
  place: 'Sample County',
  sample: true,
  notice: 'This is a sample ballot. The candidates, races and records are fictional.',
  contests: [
    {
      id: 'us-house-7', kind: 'candidate', office: 'U.S. House', sub: 'District 7 · Vote for one', researched: true,
      issues: ['tax', 'wages', 'trade', 'debt', 'housing', 'schools', 'safety', 'immigration', 'guns', 'abortion', 'lgbtq', 'cannabis', 'health', 'energy', 'voting'],
      sources: 'Congressional roll-call votes 2023–26 · 2026 candidate questionnaire · campaign platforms.',
      choices: [
        choice('Dana Whitfield', 'Democratic', {
          tax: [2, 'Voted for the 2025 child-care package, paid for by a surtax on incomes over $1M.'],
          wages: [-2, 'Co-sponsored the bill raising the federal minimum wage to $17.'],
          trade: [0, 'Voted for tariffs on steel, and against broader ones on consumer goods.'],
          debt: [-2, 'Signed a pledge to oppose any cut to Social Security benefits.'],
          housing: [1, 'Co-sponsored a bill tying transit grants to local zoning reform.'],
          schools: [2, 'Voted against a federal voucher pilot in 2024.'],
          safety: [1, 'Backs federal grants for crisis-response teams alongside police hiring.'],
          immigration: [1, 'Supports a path to citizenship paired with more border staffing.'],
          guns: [-2, 'Co-sponsored universal background checks and a limit on high-capacity magazines.'],
          abortion: [-2, 'Co-sponsored a bill to restore nationwide abortion access.'],
          lgbtq: [2, 'Co-sponsored the Equality Act.'],
          cannabis: [1, 'Voted to remove marijuana from the federal controlled-substances list.'],
          health: [-2, 'Supports letting anyone 55 or older buy into Medicare.'],
          energy: [2, 'Voted to extend clean-energy tax credits.'],
          voting: [-2, 'Co-sponsored a bill requiring every state to offer mail voting.'],
        }),
        choice('Tom Brandt', 'Republican', {
          tax: [-2, 'Signed a pledge to oppose any federal income-tax increase.'],
          wages: [2, 'Opposes a federal minimum-wage increase and says states should set it.'],
          trade: [-2, 'Supports a 20% tariff on most imports.'],
          debt: [0, 'Wants a debt commission, but says benefits for current retirees are off the table.'],
          housing: [1, 'Wants to cut federal permitting rules that slow construction.'],
          schools: [-2, 'Sponsored a school-choice tax credit as a state legislator.'],
          safety: [-2, 'Endorsed by the state police association and backs more enforcement grants.'],
          immigration: [-2, 'Supports finishing the border wall and expanding deportations.'],
          guns: [2, 'A-rated by the NRA and opposes universal background checks.'],
          abortion: [2, 'Supports a national 15-week limit with exceptions.'],
          lgbtq: [-2, 'Voted against the Equality Act, citing religious-liberty concerns.'],
          cannabis: [-1, 'Opposes federal legalization and would leave medical use to states.'],
          health: [2, 'Wants to expand health savings accounts and allow insurance sales across state lines.'],
          energy: [-2, 'Supports expanding oil and gas leasing on federal land.'],
          voting: [2, 'Co-sponsored a bill requiring photo ID in federal elections.'],
        }),
        choice('Ruth Kessler', 'Independent', {
          tax: [0, 'Proposes freezing both tax rates and program budgets for two years.'],
          wages: [-1, 'Supports a $15 federal minimum wage, phased in by region.'],
          trade: [1, 'Opposes broad tariffs and supports targeted ones on chips and steel.'],
          debt: [1, 'Proposes raising the retirement age by two years for people under 45.'],
          housing: [2, 'Her main promise: federal incentives for cities that allow apartments near transit.'],
          safety: [-1, 'Wants more officers, with mental-health responders sent on some 911 calls.'],
          immigration: [0, 'Supports more border agents and more work visas in the same bill.'],
          guns: [-1, 'Supports universal background checks and opposes an assault-weapons ban.'],
          abortion: [-1, 'Would restore access up to viability, with exceptions after.'],
          lgbtq: [1, 'Supports federal protections in employment and housing.'],
          cannabis: [2, 'Supports full federal legalization.'],
          health: [0, 'Supports a public option alongside private plans.'],
          energy: [0, 'Supports an “all of the above” energy plan with no emissions target.'],
          voting: [0, 'Supports both voter ID and automatic registration.'],
        }),
      ],
    },
    {
      id: 'state-senate-14', kind: 'candidate', office: 'State Senate', sub: 'District 14 · Vote for one', researched: true,
      issues: ['tax', 'wages', 'housing', 'schools', 'safety', 'sentencing', 'immigration', 'guns', 'abortion', 'lgbtq', 'cannabis', 'health', 'energy', 'voting'],
      sources: 'State legislature votes 2023–25 · 2026 candidate questionnaire.',
      choices: [
        choice('Priya Raman', 'Democratic', {
          tax: [1, 'Voted for the 2025 teacher raise, funded by a franchise-tax increase.'],
          wages: [-1, 'Voted to let cities set their own minimum wage.'],
          housing: [-1, 'Voted against the 2025 bill overriding local minimum lot sizes.'],
          schools: [2, 'Voted against the 2025 education savings account (voucher) bill.'],
          safety: [1, 'Wrote the bill funding police and mental-health co-responder teams.'],
          sentencing: [-2, 'Wrote the 2025 law expanding drug-court diversion.'],
          immigration: [1, 'Voted against requiring local police to join federal immigration enforcement.'],
          guns: [-2, 'Sponsored the state red-flag bill.'],
          abortion: [-2, 'Supports a constitutional amendment protecting abortion access.'],
          lgbtq: [2, 'Voted against the 2025 bathroom bill.'],
          cannabis: [1, 'Voted to expand the medical marijuana program.'],
          health: [-2, 'Supports expanding Medicaid.'],
          energy: [1, 'Supports the state target of a clean power grid by 2040.'],
          voting: [-2, 'Voted for online voter registration.'],
        }),
        choice('Gene Castillo', 'Republican', {
          tax: [-1, 'Voted against the teacher raise, citing the tax increase.'],
          wages: [1, 'Voted to stop cities from setting their own minimum wage.'],
          housing: [2, 'Wrote the bill overriding local minimum lot sizes to allow more homes.'],
          schools: [-1, 'Voted for the education savings account bill.'],
          safety: [-1, 'Voted to raise state trooper funding by 12%.'],
          sentencing: [1, 'Voted for longer sentences for fentanyl dealing.'],
          immigration: [-2, 'Wrote the bill requiring county jails to work with federal immigration agents.'],
          guns: [2, 'Voted for permitless carry.'],
          abortion: [1, 'Supports the current ban, but voted to clarify medical exceptions.'],
          lgbtq: [-1, 'Voted for the 2025 bathroom bill.'],
          health: [1, 'Opposes Medicaid expansion and supports a state reinsurance program.'],
          energy: [-1, 'Opposes the 2040 clean-grid target as too costly.'],
          voting: [1, 'Voted for more frequent voter-roll reviews.'],
        }),
      ],
    },
    {
      id: 'supreme-court-4', kind: 'candidate', office: 'Supreme Court', sub: 'State Supreme Court, Place 4 · Vote for one', researched: true,
      issues: ['judicial'],
      summary: 'Judges can’t promise how they’ll rule. We match only on opinions they’ve already written.',
      sources: 'Published opinions, State Supreme Court and 3rd Court of Appeals, 2018–26.',
      choices: [
        choice('Ellen Park', 'Republican', { judicial: [-2, 'In 41 majority opinions, relied on the original meaning of the text in all but two.'] }),
        choice('Marco Díaz', 'Democratic', { judicial: [1, 'As an appeals judge, often wrote that laws should be read in light of their purpose.'] }),
      ],
    },
    {
      id: 'district-court-reyes', kind: 'retention', office: 'District Court', sub: 'Retain Judge Alma Reyes? · Yes or No', researched: true,
      issues: ['sentencing'], choices: [],
      sources: 'County sentencing data 2019–26 · State Bar judicial evaluation 2026 · Court of Appeals records · Judicial Conduct Commission.',
      record: {
        issue: 'sentencing',
        stance: { pos: -1, text: 'Her drug-case sentences average 18% shorter than the county’s, and she sends 1 in 4 eligible defendants to diversion.' },
        facts: [
          { value: '74%', label: 'of local lawyers surveyed say retain' },
          { value: '6%', label: 'of her rulings reversed on appeal (court average 9%)' },
          { value: '0', label: 'disciplinary actions in 8 years on the bench' },
        ],
      },
    },
    {
      id: 'county-commissioner-3', kind: 'candidate', office: 'County Commissioner', sub: 'Precinct 3 · Vote for one', researched: true,
      issues: ['tax', 'housing', 'safety', 'transit', 'immigration'],
      sources: 'Commissioners Court minutes 2024–26 · local news coverage.',
      choices: [
        choice('Lena Morrow', 'Democratic', {
          tax: [1, 'Voted for the 2026 budget that added 40 library and parks jobs.'],
          housing: [2, 'Pushed the county’s fast-track permit program for apartments.'],
          safety: [1, 'Moved $3M from jail expansion to a new diversion center.'],
          transit: [2, 'Voted for the county’s share of the new rail line.'],
          immigration: [1, 'Voted to end the jail’s voluntary agreement with federal immigration agents.'],
        }),
        choice('Walt Hendry', 'Republican', {
          tax: [-2, 'Wants to cut the county property-tax rate by 8%.'],
          housing: [-1, 'Opposed the fast-track permit program over traffic concerns.'],
          safety: [-2, 'Supports the full jail expansion.'],
          transit: [-2, 'Wants to shift transit money to widening roads.'],
          immigration: [-2, 'Wants to restore the jail’s agreement with federal immigration agents.'],
        }),
      ],
    },
    {
      id: 'school-board-2', kind: 'candidate', office: 'School Board', sub: 'Trustee, Place 2 · Nonpartisan · Vote for one', researched: true,
      issues: ['schools', 'tax'],
      sources: 'Board meeting votes 2022–26 · League of Women Voters questionnaire.',
      choices: [
        choice('Ada Nwosu', undefined, { schools: [2, 'Opposes the district joining the state voucher program.'], tax: [1, 'Campaigned for the 2024 bond to repair school buildings.'] }),
        choice('Dev Malhotra', undefined, { schools: [1, 'Would keep money in district schools, with more magnet programs.'], tax: [0, 'Supports new bonds only after an independent audit.'] }),
        choice('Craig Pollard', undefined, { schools: [-2, 'Wants the district to join the state voucher program.'], tax: [-2, 'Opposes any new school bonds.'] }),
      ],
    },
    {
      id: 'prop-a', kind: 'measure', office: 'Proposition A', sub: 'County housing bond · Yes or No', researched: true,
      issues: ['housing', 'tax'],
      summary: 'Borrows $400 million to build affordable housing, repaid through property taxes (about $38 a year on a median home).',
      sources: 'Ballot language · county budget office estimate.',
      choices: [
        choice('Yes', undefined, { housing: [2, 'Funds about 2,500 new income-restricted homes over six years.'], tax: [1, 'Raises the typical homeowner’s taxes about $38 a year.'] }),
        choice('No', undefined, { housing: [-1, 'Keeps housing funding at current levels.'], tax: [-2, 'Keeps property taxes where they are.'] }),
      ],
    },
    {
      id: 'prop-b', kind: 'measure', office: 'Proposition B', sub: 'Transit sales tax · Yes or No', researched: true,
      issues: ['tax', 'transit', 'energy'],
      summary: 'Adds a quarter-cent sales tax for 20 years to fund electric buses, 30% more bus service and two new rail lines.',
      sources: 'Ballot language · transit authority plan.',
      choices: [
        choice('Yes', undefined, { tax: [1, 'Adds 25¢ to a $100 purchase to pay for more transit service.'], transit: [2, 'Adds two rail lines and 30% more bus service by 2032.'], energy: [1, 'Replaces diesel buses with electric ones by 2032.'] }),
        choice('No', undefined, { tax: [-1, 'Keeps the sales tax at its current rate.'], transit: [-1, 'Keeps bus and rail service at current levels.'], energy: [-1, 'Diesel buses stay in service until replaced on the normal schedule.'] }),
      ],
    },
  ],
};
