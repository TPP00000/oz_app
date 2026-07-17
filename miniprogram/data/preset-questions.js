// data/preset-questions.js - 内置预设问题库
// 出题时可以从这里随机抽取，帮助冷启动

const PRESET_QUESTIONS = [
  '我们第一次见面时，你对我的第一印象是什么？',
  '你还记得我们第一次约会的细节吗？印象最深的是哪个瞬间？',
  '如果用三个词形容现在的我，你会选哪三个？',
  '你最喜欢我做的哪一道菜或哪一件小事？',
  '我们一起做过的事情里，你最想再来一次的是什么？',
  '你心里我们最浪漫的一次经历是哪次？',
  '如果周末可以去任何地方，你最想和我去哪里？',
  '你第一次觉得"就是这个人了"是在什么时候？',
  '我有什么小习惯是你偷偷觉得很可爱的？',
  '你希望我们十年后的生活是什么样子？',
  '如果我们能一起养一只小动物，你想养什么？给它取什么名字？',
  '你最近有什么烦恼是还没来得及告诉我的？',
  '你觉得我们最有默契的一件事是什么？',
  '如果重新认识一次，你会用什么方式跟我搭话？',
  '你手机里最喜欢的一张我们的合照是哪张？为什么？',
  '有什么话你一直想对我说，但总觉得不好意思？',
  '你觉得我生气的时候，最有效的哄法是什么？',
  '我们的下一次旅行，你希望是海边、山里还是城市？',
  '如果给我们的爱情写一句歌词，你会写什么？',
  '你最想和我一起完成的一件"人生清单"上的事是什么？'
]

/**
 * 随机抽取 n 个不重复的预设问题
 * @param {number} n 数量
 * @returns {string[]}
 */
function pickRandom(n) {
  // Fisher-Yates 洗牌（在副本上进行，不改动原数组）
  const shuffled = [...PRESET_QUESTIONS]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = tmp
  }
  return shuffled.slice(0, Math.min(n, shuffled.length))
}

module.exports = { PRESET_QUESTIONS, pickRandom }
