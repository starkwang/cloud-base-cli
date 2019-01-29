import * as node_ssh from 'node-ssh'
import * as path from 'path'
import Logger from '../logger'

const logger = new Logger('NodeUploader')

export default class NodeUploader {
    ssh: any
    _options: INodeUploaderOptions
    constructor(options: INodeUploaderOptions) {
        this.ssh = new node_ssh()
        this._options = options
    }

    async upload() {
        const { host, username, port, password, distPath, remotePath }  = this._options

        logger.log(`Deploying ${distPath} to ${username}@${host}:${remotePath}`)
        await this.ssh.connect({
            host,
            username,
            port,
            password,
        })
    
        await this.ssh.execCommand(`rm -rf ${remotePath}`)
        await this.ssh.putDirectory(path.resolve(process.cwd(), distPath), remotePath)

        logger.log('Unzip...')
        const { stdout } = await this.ssh.execCommand(`cd ${distPath} && unzip dist.zip`)

        this.ssh.dispose()
    }
}

interface INodeUploaderOptions {
    host: string
    username: string
    port: number
    password: string

    distPath: string
    remotePath: string
}