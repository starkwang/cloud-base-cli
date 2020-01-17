import { cosmiconfig, cosmiconfigSync } from 'cosmiconfig'
import { CloudBaseError } from '../../error'

const MODULE_NAME = 'cloudbase'

export async function loadConfig(options: { moduleName?: string; configPath?: string } = {}) {
    const { moduleName = MODULE_NAME, configPath } = options

    const explorer = cosmiconfig(moduleName, {
        searchPlaces: [
            'package.json',
            `${moduleName}rc`,
            `${moduleName}rc.json`,
            `${moduleName}rc.yaml`,
            `${moduleName}rc.yml`,
            `${moduleName}rc.js`,
            `${moduleName}.config.js`
        ]
    })

    // 从指定路径加载配置文件
    if (configPath) {
        try {
            const result = await explorer.load(configPath)
            if (!result) return null
            const { config, filepath, isEmpty } = result
            return config
        } catch (e) {
            // TODO: check
            throw new CloudBaseError(e.message)
        }
    }

    // 搜索配置文件
    try {
        const result = await explorer.search(process.cwd())
        if (!result) return null
        const { config, filepath, isEmpty } = result
        return config
    } catch (e) {
        // TODO: check
        throw new CloudBaseError(e.message)
    }
}

// loadConfig().then(console.log)
