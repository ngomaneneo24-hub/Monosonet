import {useCallback, useMemo} from 'react'
import {Keyboard, StyleSheet} from 'react-native'
import {
  FontAwesomeIcon,
  FontAwesomeIconStyle,
} from '@fortawesome/react-native-fontawesome'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {LANG_DROPDOWN_HITSLOP} from '#/lib/constants'
import {usePalette} from '#/lib/hooks/usePalette'
import {isNative} from '#/platform/detection'
import {useModalControls} from '#/state/modals'
import {
  hasNoteLanguage,
  toNoteLanguages,
  useLanguagePrefs,
  useLanguagePrefsApi,
} from '#/state/preferences/languages'
import {
  DropdownButton,
  DropdownItem,
  DropdownItemButton,
} from '#/view/com/util/forms/DropdownButton'
import {Text} from '#/view/com/util/text/Text'
import {codeToLanguageName} from '../../../../locale/helpers'

export function SelectLangBtn() {
  const pal = usePalette('default')
  const {_} = useLingui()
  const {openModal} = useModalControls()
  const langPrefs = useLanguagePrefs()
  const setLangPrefs = useLanguagePrefsApi()

  const onPressMore = useCallback(async () => {
    if (isNative) {
      if (Keyboard.isVisible()) {
        Keyboard.dismiss()
      }
    }
    openModal({name: 'note-languages-settings'})
  }, [openModal])

  const noteLanguagesPref = toNoteLanguages(langPrefs.noteLanguage)
  const items: DropdownItem[] = useMemo(() => {
    let arr: DropdownItemButton[] = []

    function add(commaSeparatedLangCodes: string) {
      const langCodes = commaSeparatedLangCodes.split(',')
      const langName = langCodes
        .map(code => codeToLanguageName(code, langPrefs.appLanguage))
        .join(' + ')

      /*
       * Filter out any duplicates
       */
      if (arr.find((item: DropdownItemButton) => item.label === langName)) {
        return
      }

      arr.push({
        icon:
          langCodes.every(code =>
            hasNoteLanguage(langPrefs.noteLanguage, code),
          ) && langCodes.length === noteLanguagesPref.length
            ? ['fas', 'circle-dot']
            : ['far', 'circle'],
        label: langName,
        onPress() {
          setLangPrefs.setNoteLanguage(commaSeparatedLangCodes)
        },
      })
    }

    if (noteLanguagesPref.length) {
      /*
       * Re-join here after sanitization bc noteLanguageHistory is an array of
       * comma-separated strings too
       */
      add(langPrefs.noteLanguage)
    }

    // comma-separted strings of lang codes that have been used in the past
    for (const lang of langPrefs.noteLanguageHistory) {
      add(lang)
    }

    return [
      {heading: true, label: _(msg`Note language`)},
      ...arr.slice(0, 6),
      {sep: true},
      {
        label: _(msg`Other...`),
        onPress: onPressMore,
      },
    ]
  }, [onPressMore, langPrefs, setLangPrefs, noteLanguagesPref, _])

  return (
    <DropdownButton
      type="bare"
      testID="selectLangBtn"
      items={items}
      openUpwards
      style={styles.button}
      hitSlop={LANG_DROPDOWN_HITSLOP}
      accessibilityLabel={_(msg`Language selection`)}
      accessibilityHint="">
      {noteLanguagesPref.length > 0 ? (
        <Text type="lg-bold" style={[pal.link, styles.label]} numberOfLines={1}>
          {noteLanguagesPref
            .map(lang => codeToLanguageName(lang, langPrefs.appLanguage))
            .join(', ')}
        </Text>
      ) : (
        <FontAwesomeIcon
          icon="language"
          style={pal.link as FontAwesomeIconStyle}
          size={26}
        />
      )}
    </DropdownButton>
  )
}

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 15,
  },
  label: {
    maxWidth: 100,
  },
})
