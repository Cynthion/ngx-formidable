import { PortalLocaleId } from './field-spec.model';

/**
 * One locale moves the calendar's translations, its first day of the week and the date field's token format
 * together. Splitting those into separate controls would lose the demonstration: the two dates in the preview
 * differ because their locales do, not because three unrelated inputs were set to three unrelated values.
 */
interface PortalLocale {
  readonly id: PortalLocaleId;
  readonly label: string;
  /** `Pikaday`'s own i18n shape, passed straight through the date field's `i18n` input. */
  readonly i18n: Pikaday.PikadayI18nConfig;
  /** 0 is Sunday. */
  readonly firstDay: number;
  /** The Unicode token format a date field takes with this locale. */
  readonly dateFormat: string;
  /** The Unicode token format a time field takes with this locale. */
  readonly timeFormat: string;
}

function months(list: readonly string[]): string[] {
  return [...list];
}

export const PORTAL_LOCALES: readonly PortalLocale[] = [
  {
    id: 'en-GB',
    label: 'English (UK)',
    firstDay: 1,
    dateFormat: 'dd . MM . yyyy',
    timeFormat: 'HH:mm',
    i18n: {
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      months: months([
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ]),
      weekdays: months(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
      weekdaysShort: months(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
    }
  },
  {
    id: 'en-US',
    label: 'English (US)',
    firstDay: 0,
    dateFormat: 'MM / dd / yyyy',
    timeFormat: 'hh:mm a',
    i18n: {
      previousMonth: 'Previous month',
      nextMonth: 'Next month',
      months: months([
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ]),
      weekdays: months(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']),
      weekdaysShort: months(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
    }
  },
  {
    id: 'de-CH',
    label: 'Deutsch (Schweiz)',
    firstDay: 1,
    dateFormat: 'dd . MM . yyyy',
    timeFormat: 'HH:mm',
    i18n: {
      previousMonth: 'Vorheriger Monat',
      nextMonth: 'Nächster Monat',
      months: months([
        'Januar',
        'Februar',
        'März',
        'April',
        'Mai',
        'Juni',
        'Juli',
        'August',
        'September',
        'Oktober',
        'November',
        'Dezember'
      ]),
      weekdays: months(['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']),
      weekdaysShort: months(['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'])
    }
  },
  {
    id: 'fr-FR',
    label: 'Français',
    firstDay: 1,
    dateFormat: 'dd / MM / yyyy',
    timeFormat: 'HH:mm',
    i18n: {
      previousMonth: 'Mois précédent',
      nextMonth: 'Mois suivant',
      months: months([
        'Janvier',
        'Février',
        'Mars',
        'Avril',
        'Mai',
        'Juin',
        'Juillet',
        'Août',
        'Septembre',
        'Octobre',
        'Novembre',
        'Décembre'
      ]),
      weekdays: months(['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']),
      weekdaysShort: months(['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'])
    }
  },
  {
    id: 'ja-JP',
    label: '日本語',
    firstDay: 0,
    dateFormat: 'yyyy / MM / dd',
    timeFormat: 'HH:mm',
    i18n: {
      previousMonth: '前の月',
      nextMonth: '次の月',
      months: months(['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']),
      weekdays: months(['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']),
      weekdaysShort: months(['日', '月', '火', '水', '木', '金', '土'])
    }
  }
];

const LOCALES_BY_ID: ReadonlyMap<PortalLocaleId, PortalLocale> = new Map(
  PORTAL_LOCALES.map((locale) => [locale.id, locale])
);

const DEFAULT_LOCALE = PORTAL_LOCALES[0]!;

export function localeOf(id: PortalLocaleId | undefined): PortalLocale {
  return (id && LOCALES_BY_ID.get(id)) || DEFAULT_LOCALE;
}
