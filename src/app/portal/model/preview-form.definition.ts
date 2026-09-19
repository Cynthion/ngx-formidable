import {
  DEFAULT_DECORATION,
  DEFAULT_STATE,
  PortalFieldDecoration,
  PortalFieldSpec,
  PortalFieldState,
  PortalFormDefinition,
  PortalFormOptions,
  PortalOptionSpec,
  PortalSectionSpec
} from './field-spec.model';

/**
 * The preview form: a time traveller's visa application.
 *
 * The context is chosen for the date field, which is the library's most configurable component and the one a
 * contrived pairing shows on — two dates in two formats and two locales is the premise rather than a demo
 * artifact. It also gives every option field a real reason for a `disabled` and a `readonly` entry.
 *
 * Every field type appears at least twice with deliberately different configuration, adjacent in the same
 * row so the difference is visible without scrolling. Nothing here names that difference in prose: the chip
 * under each field states its kind, and its tooltip is derived from the specification — so two fields
 * reading `Date` and rendering different formats show the pairing rather than claim it, and neither can
 * disagree with the field once it has been edited.
 */

const DECORATION: PortalFieldDecoration = DEFAULT_DECORATION;
const STATE: PortalFieldState = DEFAULT_STATE;

function field(
  spec: Partial<PortalFieldSpec> & Pick<PortalFieldSpec, 'id' | 'kind' | 'sectionId' | 'label'>
): PortalFieldSpec {
  return {
    name: spec.id,
    placeholder: '',
    span: 1,
    decoration: DECORATION,
    state: STATE,
    ...spec
  };
}

// An era closed for maintenance is disabled, an era open to observers only is readonly. The state has a
// reason a visitor understands without being told, which is what makes the sample honest rather than
// decorative.
const ERAS: readonly PortalOptionSpec[] = [
  { value: 'cretaceous', label: 'Late Cretaceous' },
  { value: 'bronze', label: 'Bronze Age' },
  { value: 'antiquity', label: 'Classical Antiquity' },
  { value: 'renaissance', label: 'Renaissance' },
  { value: 'industrial', label: 'Industrial Revolution' },
  { value: 'permian', label: 'Permian — closed for maintenance', disabled: true },
  { value: 'big-bang', label: 'First Second — observers only', readonly: true }
];

const SECTORS: readonly PortalOptionSpec[] = [
  { value: 'core', label: 'Core Worlds' },
  { value: 'rim', label: 'Outer Rim' },
  { value: 'drift', label: 'The Drift' },
  { value: 'void', label: 'The Void — quarantined', disabled: true },
  { value: 'archive', label: 'The Archive — observers only', readonly: true }
];

const CITIES: readonly PortalOptionSpec[] = [
  { value: 'alexandria', label: 'Alexandria, 48 BCE' },
  { value: 'cordoba', label: 'Córdoba, 961' },
  { value: 'venice', label: 'Venice, 1503' },
  { value: 'kyoto', label: 'Kyoto, 1615' },
  { value: 'vienna', label: 'Vienna, 1900' },
  { value: 'pompeii', label: 'Pompeii, 79 — closed', disabled: true },
  { value: 'lighthouse', label: 'The Lighthouse — observers only', readonly: true }
];

// The autocomplete projects a custom option component, so these carry the second line it renders.
const ANCHORS: readonly PortalOptionSpec[] = [
  { value: 'lighthouse', label: 'Pharos Lighthouse', subtitle: 'Alexandria, 280 BCE' },
  { value: 'library', label: 'Library of Alexandria', subtitle: 'Alexandria, 285 BCE' },
  { value: 'colossus', label: 'Colossus of Rhodes', subtitle: 'Rhodes, 280 BCE' },
  { value: 'hanging-gardens', label: 'Hanging Gardens', subtitle: 'Babylon, 600 BCE' },
  { value: 'great-pyramid', label: 'Great Pyramid', subtitle: 'Giza, 2560 BCE' },
  { value: 'temple', label: 'Temple of Artemis', subtitle: 'Collapsed — unusable', disabled: true },
  { value: 'mausoleum', label: 'Mausoleum at Halicarnassus', subtitle: 'Observers only', readonly: true }
];

const PURPOSES: readonly PortalOptionSpec[] = [
  { value: 'tourism', label: 'Tourism' },
  { value: 'research', label: 'Research' },
  { value: 'repair', label: 'Timeline repair' },
  { value: 'colonisation', label: 'Colonisation — prohibited', disabled: true },
  { value: 'observation', label: 'Observation only', readonly: true }
];

const CLEARANCES: readonly PortalOptionSpec[] = [
  { value: 'green', label: 'Green — unescorted' },
  { value: 'amber', label: 'Amber — escorted' },
  { value: 'black', label: 'Black — on file only', readonly: true },
  { value: 'red', label: 'Red — sealed capsule', disabled: true }
];

const DECLARATIONS: readonly PortalOptionSpec[] = [
  { value: 'no-lottery', label: 'I carry no lottery results' },
  { value: 'no-ancestors', label: 'I will not contact my ancestors' },
  { value: 'no-tech', label: 'I carry no anachronistic technology' },
  { value: 'no-self', label: 'I will not meet myself', readonly: true },
  { value: 'grandfather', label: 'Grandfather clause — unavailable', disabled: true }
];

const WAIVERS: readonly PortalOptionSpec[] = [
  { value: 'memory', label: 'Memory reconciliation' },
  { value: 'entropy', label: 'Entropy surcharge' },
  { value: 'causality', label: 'Causality rider — countersigned', readonly: true },
  { value: 'duplicate', label: 'Duplicate-self indemnity', disabled: true }
];

const PREVIEW_SECTIONS: readonly PortalSectionSpec[] = [
  { id: 'traveller', title: 'The Traveller' },
  { id: 'journey', title: 'The Journey' },
  { id: 'rules', title: 'The Rules' },
  { id: 'small-print', title: 'Small Print' }
];

export const PREVIEW_FIELDS: readonly PortalFieldSpec[] = [
  // #region The Traveller
  field({
    id: 'travellerName',
    kind: 'input',
    sectionId: 'traveller',
    label: 'Name',
    placeholder: 'As it appears in your own century',
    decoration: { ...DECORATION, showRequiredMarker: true, hint: 'Your name in your era of origin.' }
  }),
  field({
    id: 'temporalId',
    kind: 'input',
    sectionId: 'traveller',
    label: 'Temporal identifier',
    mask: 'AAA-0000',
    showMaskTyped: true,
    decoration: { ...DECORATION, showRequiredMarker: true }
  }),
  field({
    id: 'originEra',
    kind: 'select',
    sectionId: 'traveller',
    label: 'Origin era',
    placeholder: 'Select…',
    options: ERAS,
    defaultOption: { value: 'unknown', label: 'Not recorded' },
    defaultOptionMode: 'always'
  }),
  field({
    id: 'originSector',
    kind: 'select',
    sectionId: 'traveller',
    label: 'Origin sector',
    placeholder: 'Select…',
    options: SECTORS,
    defaultOption: { value: 'none', label: 'No sector on file' },
    defaultOptionMode: 'fallback',
    sortAlphabetically: true
  }),
  // #endregion

  // #region The Journey
  field({
    id: 'destinationEra',
    kind: 'dropdown',
    sectionId: 'journey',
    label: 'Destination era',
    placeholder: 'Where to?',
    options: ERAS,
    panelPosition: 'right'
  }),
  field({
    id: 'destinationCity',
    kind: 'dropdown',
    sectionId: 'journey',
    label: 'Destination city',
    placeholder: 'Where exactly?',
    options: CITIES,
    panelPosition: 'sheet'
  }),
  field({
    id: 'arrivalDate',
    kind: 'date',
    sectionId: 'journey',
    label: 'Arrival date',
    unicodeTokenFormat: 'dd . MM . yyyy',
    emptyHint: 'format',
    locale: 'en-GB',
    panelPosition: 'right'
  }),
  field({
    id: 'returnDate',
    kind: 'date',
    sectionId: 'journey',
    label: 'Return date',
    unicodeTokenFormat: 'yyyy / MM / dd',
    emptyHint: 'underscores',
    locale: 'ja-JP',
    panelPosition: 'left'
  }),
  field({
    id: 'arrivalTime',
    kind: 'time',
    sectionId: 'journey',
    label: 'Arrival time',
    unicodeTokenFormat: 'HH:mm'
  }),
  field({
    id: 'departureTime',
    kind: 'time',
    sectionId: 'journey',
    label: 'Departure time',
    unicodeTokenFormat: 'hh:mm a',
    emptyHint: 'format'
  }),
  field({
    id: 'companions',
    kind: 'counter',
    sectionId: 'journey',
    label: 'Companions',
    min: 0,
    max: 8,
    step: 1
  }),
  field({
    id: 'luggage',
    kind: 'counter',
    sectionId: 'journey',
    label: 'Sealed luggage units',
    min: 0,
    max: 4,
    step: 1,
    state: { ...STATE, readonly: true }
  }),
  // #endregion

  // #region The Rules
  field({
    id: 'purpose',
    kind: 'radio-group',
    sectionId: 'rules',
    label: 'Purpose of visit',
    options: PURPOSES,
    defaultOption: { value: 'undeclared', label: 'Undeclared' },
    defaultOptionMode: 'always'
  }),
  field({
    id: 'clearance',
    kind: 'radio-group',
    sectionId: 'rules',
    label: 'Clearance level',
    options: CLEARANCES,
    state: { ...STATE, disabled: true }
  }),
  field({
    id: 'declarations',
    kind: 'checkbox-group',
    sectionId: 'rules',
    label: 'Declarations',
    options: DECLARATIONS,
    sortAlphabetically: true
  }),
  field({
    id: 'waivers',
    kind: 'checkbox-group',
    sectionId: 'rules',
    label: 'Waivers signed',
    options: WAIVERS,
    state: { ...STATE, readonly: true }
  }),
  field({
    id: 'paradoxTolerance',
    kind: 'slider',
    sectionId: 'rules',
    label: 'Paradox tolerance',
    min: 0,
    max: 100,
    step: 10,
    minLabel: 'None',
    maxLabel: 'Total',
    showThumbLabel: true,
    showTickMarks: true,
    showTickLabels: true,
    showMinMaxLabels: true,
    thumbLabelFormat: 'percent',
    tickLabelFormat: 'percent'
  }),
  field({
    id: 'insuranceBudget',
    kind: 'slider',
    sectionId: 'rules',
    label: 'Entropy insurance',
    min: 0,
    max: 5000,
    step: 250,
    showThumbLabel: true,
    showTickMarks: false,
    showTickLabels: false,
    showMinMaxLabels: false,
    thumbLabelFormat: 'currency'
  }),
  field({
    id: 'anchorPoint',
    kind: 'autocomplete',
    sectionId: 'rules',
    label: 'Anchor point',
    placeholder: 'Type to filter…',
    options: ANCHORS,
    panelPosition: 'full'
  }),
  field({
    id: 'anchorBackup',
    kind: 'autocomplete',
    sectionId: 'rules',
    label: 'Backup anchor',
    placeholder: 'Type to filter…',
    options: ANCHORS,
    defaultOption: { value: 'add', label: 'Request a new anchor…' },
    defaultOptionMode: 'fallback',
    panelPosition: 'sheet'
  }),
  // #endregion

  // #region Small Print
  field({
    id: 'metYourself',
    kind: 'toggle',
    sectionId: 'small-print',
    label: 'Have you met yourself',
    toggleLabelPosition: 'before',
    onLabel: 'Yes, once',
    offLabel: 'Not yet'
  }),
  field({
    id: 'acceptsParadox',
    kind: 'toggle',
    sectionId: 'small-print',
    label: 'Paradox liability accepted',
    toggleLabelPosition: 'after',
    onLabel: 'Accepted',
    offLabel: 'Pending review',
    state: { ...STATE, disabled: true }
  }),
  field({
    id: 'notes',
    kind: 'textarea',
    sectionId: 'small-print',
    label: 'Notes to your past self',
    placeholder: 'Nothing actionable, please',
    maxLength: 280,
    enableAutosize: true,
    showLengthIndicator: true,
    decoration: { ...DECORATION, hint: 'Read by a clerk in your origin century.', hintAlign: 'start' }
  }),
  field({
    id: 'undertaking',
    kind: 'textarea',
    sectionId: 'small-print',
    label: 'Undertaking',
    placeholder: 'I undertake to return the way I came',
    enableAutosize: false,
    showLengthIndicator: false
  })
  // #endregion
];

const PREVIEW_FORM_OPTIONS: PortalFormOptions = {
  labelPosition: 'inside',
  showLabels: true,
  showRequiredMarkers: true,
  showHints: true,
  showAdornments: false,
  adornmentAlignment: 'center',
  panelPosition: 'right',
  readonly: false,
  disabled: false,
  revealOn: 'touched',
  updateOn: 'change',
  validator: 'vest',
  locale: 'en-GB'
};

export const PREVIEW_FORM_DEFINITION: PortalFormDefinition = {
  title: 'Temporal Transit Visa',
  intro: 'Complete every section. A visa is valid for one outbound and one return transit.',
  submit: { label: 'Request Visa', accepted: 'Visa issued. Safe travels.', rejected: 'The application is incomplete.' },
  sections: PREVIEW_SECTIONS,
  fields: PREVIEW_FIELDS,
  options: PREVIEW_FORM_OPTIONS
};

/**
 * What the form starts filled with. An empty form shows none of the filled, selected or floating-label states
 * that a theme is judged by.
 */
export const PREVIEW_INITIAL_MODEL: Readonly<Record<string, unknown>> = {
  travellerName: 'Ada Kestrel',
  temporalId: 'TTA-4417',
  originEra: 'industrial',
  originSector: 'core',
  destinationEra: 'renaissance',
  destinationCity: 'venice',
  arrivalDate: new Date(1503, 4, 12),
  returnDate: new Date(1503, 5, 2),
  arrivalTime: new Date(2000, 0, 1, 9, 15),
  departureTime: new Date(2000, 0, 1, 17, 40),
  companions: 2,
  luggage: 1,
  purpose: 'research',
  clearance: 'amber',
  declarations: ['no-lottery', 'no-self'],
  waivers: ['entropy'],
  paradoxTolerance: 30,
  insuranceBudget: 1750,
  anchorPoint: 'lighthouse',
  anchorBackup: null,
  metYourself: false,
  acceptsParadox: true,
  notes: 'Do not buy the second printing.',
  undertaking: ''
};
