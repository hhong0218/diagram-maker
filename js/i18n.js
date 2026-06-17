// Lightweight i18n for the static diagram maker.
// Language is taken from <html lang="...">. Korean ('ko') is the default so the
// Korean root keeps working unchanged; the English build (/en/) sets lang="en".
const I18n = {
  lang: (document.documentElement.lang || 'ko').slice(0, 2).toLowerCase() === 'en' ? 'en' : 'ko',

  strings: {
    ko: {
      modeSwitchTitle: '모드 전환',
      modeSwitchMsg: '모드 전환 시 캔버스가 초기화됩니다. 계속하시겠습니까?',
      jsonImported: 'JSON 불러오기 완료',
      jsonParseFail: 'JSON 파싱 실패',
      selectNodeFirst: '편집할 노드를 먼저 선택하세요',
      defaultText: '텍스트',
      labelPlaceholder: '라벨 입력',
      copied: '복사됨',
      pasted: '붙여넣기 완료',
      shareCopied: '공유 링크가 복사되었습니다!',
      shareTitle: '공유 링크',
      shareFailSuffix: '\n\n복사에 실패했습니다. 위 주소를 직접 복사해 주세요.',
      pngModuleFail: 'PNG 모듈을 불러오지 못했습니다. 네트워크 확인 후 다시 시도하거나 SVG 저장을 이용하세요.',
      pngFail: 'PNG 저장 실패',
      pngDone: 'PNG 저장 완료!',
      pngFailMsg: 'PNG 저장 실패: ',
      newNode: '새 노드',
      centerTopic: '중심 주제'
    },
    en: {
      modeSwitchTitle: 'Switch mode',
      modeSwitchMsg: 'Switching modes will clear the canvas. Continue?',
      jsonImported: 'JSON imported',
      jsonParseFail: 'Failed to parse JSON',
      selectNodeFirst: 'Select a node to edit first',
      defaultText: 'Text',
      labelPlaceholder: 'Enter label',
      copied: 'Copied',
      pasted: 'Pasted',
      shareCopied: 'Share link copied to clipboard!',
      shareTitle: 'Share link',
      shareFailSuffix: '\n\nCopy failed. Please copy the address above manually.',
      pngModuleFail: 'Could not load the PNG module. Check your connection and try again, or use SVG export.',
      pngFail: 'PNG export failed',
      pngDone: 'PNG saved!',
      pngFailMsg: 'PNG export failed: ',
      newNode: 'New node',
      centerTopic: 'Central topic'
    }
  },

  t(key) {
    const table = this.strings[this.lang] || this.strings.ko;
    return (key in table) ? table[key] : (this.strings.ko[key] || key);
  }
};
