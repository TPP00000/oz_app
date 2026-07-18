// config.js - 环境配置
const CLOUD_ENV = 'cloud1-d3glvgdfc35da7c40'

// 云存储文件根路径（换环境只改这一处）
const CLOUD_FILE_BASE =
  'cloud://cloud1-d3glvgdfc35da7c40.636c-cloud1-d3glvgdfc35da7c40-1455308583/'

// 愿望树成长图目录；上传素材后生效，留空时回退到包内的静态树图
const TREE_STAGE_PREFIX = CLOUD_FILE_BASE + 'tree-stages/'

// 房间场景图（卧室昼/夜、厨房）目录
const ROOM_ASSET_PREFIX = CLOUD_FILE_BASE + 'rooms/'

module.exports = { CLOUD_ENV, CLOUD_FILE_BASE, TREE_STAGE_PREFIX, ROOM_ASSET_PREFIX }
