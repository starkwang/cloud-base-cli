import NodeSSH from 'node-ssh'
import path from 'path'
import Logger from '../../logger'
import { INodeDeployConfig } from './deployer'

const logger = new Logger('NodeZipUploader')

export default class NodeUploader {
    ssh: any
    _options: INodeDeployConfig
    constructor(options: INodeDeployConfig) {
        this.ssh = new NodeSSH()
        this._options = options
    }

    async upload(zipFileName = 'dist.zip') {
        const {
            host,
            username,
            port,
            password,
            distPath,
            remotePath
        } = this._options

        logger.log(`Deploying ${distPath} to ${username}@${host}:${remotePath}`)
        await this.ssh.connect({
            host,
            username,
            port,
            password
        })

        await this.ssh.execCommand(`rm -rf ${remotePath}`)
        await this.ssh.putDirectory(
            path.resolve(process.cwd(), distPath),
            remotePath
        )

        let command = `cd ${remotePath} && unzip ${zipFileName} && rm ${zipFileName}`
        logger.log('Unzip...')
        logger.log(command)
        const { stderr } = await this.ssh.execCommand(command)

        if (stderr) console.log(stderr)

        this.ssh.dispose()
    }
}
