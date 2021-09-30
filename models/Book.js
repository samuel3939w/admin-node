const { MIME_TYPE_EPUB, UPLOAD_URL, UPLOAD_PATH } = require('../utils/constant')
const fs = require('fs')
const path = require('path')
const Epub = require('../utils/epub')
const xml2js = require('xml2js').parseString

class Book {
    constructor(file, data) {
        if (file) {
            this.createBookFromFile(file)
        } else {
            this.createBookFromData(data)
        }
    }

    createBookFromFile(file) {
        const { destination, filename, mimetype = MIME_TYPE_EPUB,
            path, originalname } = file
        //電子書文件後墜名
        const suffix = mimetype === MIME_TYPE_EPUB ? ".epub" : ""
        //電子書原有路徑
        const oldBookPath = path
        //電子書的新路徑
        const bookPath = `${destination}/${filename}${suffix}`
        //電子書的下載URL
        const url = `${UPLOAD_URL}/book/${filename}${suffix}`
        //電子書解壓後的文件夾路徑
        const unzipPath = `${UPLOAD_PATH}/unzip/${filename}`
        //電子書解壓後的文件夾URL
        const unzipUrl = `${UPLOAD_URL}/unzip/${filename}`
        if (!fs.existsSync(unzipPath)) {
            fs.mkdirSync(unzipPath, { recursive: true })
        }
        if (fs.existsSync(oldBookPath) && !fs.existsSync(bookPath)) {
            fs.renameSync(oldBookPath, bookPath)
        }
        this.fileName = filename //文件名
        this.path = `/book/${filename}${suffix}` //epub文件相對路徑
        this.filePath = this.path
        this.unzipPath = `/unzip/${filename}` //epub解壓後相對路徑
        this.url = url //epub文件下載連結
        this.title = '' //書名
        this.author = '' //作者
        this.publisher = '' //出版社
        this.contents = [] //目錄
        this.contentsTree = [] //樹狀目錄結構
        this.cover = '' //封面圖片URL
        this.coverPath = '' //封面圖片路徑
        this.category = -1 //分類ID
        this.categoryText = '' //分類名稱
        this.language = '' //語種
        this.unzipUrl = unzipUrl //解壓後文件夾連結
        this.originalName = originalname //電子書文件的原名
    }

    createBookFromData(data) {
        this.fileName = data.fileName
        this.cover = data.coverPath
        this.title = data.title
        this.author = data.author
        this.publisher = data.publisher
        this.bookId = data.fileName
        this.language = data.language
        this.rootFile = data.rootFile
        this.originalName = data.originalName
        this.path = data.path || data.filePath
        this.filePath = data.path || data.filePath
        this.unzipPath = data.unzipPath
        this.coverPath = data.coverPath
        this.createUser = data.username
        this.createDt = new Date().getTime()
        this.updateDt = new Date().getTime()
        this.updateType = data.updateType === 0 ? data.updateType : 1
        this.category = data.category || 99
        this.categoryText = data.categoryText || '自定義'
        this.contents = data.contents || []
    }

    parse() {
        return new Promise((resolve, reject) => {
            const bookPath = `${UPLOAD_PATH}${this.filePath}`
            if (!fs.existsSync(bookPath)) {
                reject(new Error('電子書不存在'))
            }
            const epub = new Epub(bookPath)
            epub.on("error", err => {
                reject(err)
            })
            epub.on('end', err => {
                if (err) {
                    reject(err)
                } else {
                    const {
                        language,
                        creator,
                        creatorFileAs,
                        title,
                        cover,
                        publisher
                    } = epub.metadata
                    if (!title) {
                        reject(new Error('圖書標題為空'))
                    } else {
                        this.title = title
                        this.language = language || 'en'
                        this.author = creator || creatorFileAs || 'unknown'
                        this.publisher = publisher || 'unknown'
                        this.rootFile = epub.rootFile
                        const handleGetImage = (err, file, mimeType) => {
                            if (err) {
                                reject(err)
                            } else {
                                const suffix = mimeType.split('/')[1]
                                const coverPath = `${UPLOAD_PATH}/img/${this.fileName}.${suffix}`
                                const coverUrl = `${UPLOAD_URL}/img/${this.fileName}.${suffix}`

                                fs.writeFileSync(coverPath, file, 'binary')
                                this.coverPath = `/img/${this.fileName}.${suffix}`
                                this.cover = coverUrl
                                resolve(this)
                            }
                        }
                        try {
                            this.unzip()
                            this.parseContents(epub).then(({ chapters, chapterTree }) => {
                                this.contents = chapters
                                this.contentsTree = chapterTree
                                epub.getImage(cover, handleGetImage)
                            })
                        } catch (e) {
                            reject(e)
                        }
                    }
                }
            })
            epub.parse()
        })
    }
    unzip() {
        const AdmZip = require('adm-zip')
        const zip = new AdmZip(Book.genPath(this.path))
        zip.extractAllTo(Book.genPath(this.unzipPath), true)
    }

    parseContents(epub) {
        function getNcxFilePath() {
            const spine = epub && epub.spine
            const manifest = epub && epub.manifest
            const ncx = spine.toc && spine.toc.href
            const id = spine.toc && spine.toc.id
            if (ncx) {
                return ncx
            } else {
                return manifest[id].href
            }
        }

        //查詢當前目錄的父級目錄及規定層次
        function findParent(array, level = 0, pid = '') {
            return array.map((item) => {
                item.level = level
                item.pid = pid
                if (item.navPoint && item.navPoint.length > 0) {
                    item.navPoint = findParent(item.navPoint, level + 1, item['$'].id)
                } else if (item.navPoint) {
                    item.navPoint.level = level + 1
                    item.navPoint.pid = item['$'].id
                }
                return item
            })
        }

        //flatten方法，將目錄轉為一維數組
        function flatten(array) {
            return [].concat(...array.map(item => {
                if (item.navPoint && item.navPoint.length > 0) {
                    return [].concat(item, ...flatten(item.navPoint))
                } else if (item.navPoint) {
                    return [].concat(item, item.navPoint)
                }
                return item
            }))
        }

        const ncxFilePath = Book.genPath(`${this.unzipPath}/${getNcxFilePath()}`)
        if (fs.existsSync(ncxFilePath)) {
            return new Promise((resolve, reject) => {
                const xml = fs.readFileSync(ncxFilePath, 'utf-8')
                const dir = path.dirname(ncxFilePath).replace(UPLOAD_PATH, '')
                xml2js(xml, {
                    explicitArray: false,
                    ignoreAttrs: false
                }, (err, json) => {
                    if (err) {
                        reject(err)
                    } else {
                        const navMap = json.ncx.navMap
                        if (navMap.navPoint && navMap.navPoint.length > 0) {
                            navMap.navPoint = findParent(navMap.navPoint)
                            const newNavMap = flatten(navMap.navPoint)
                            const chapters = []
                            newNavMap.forEach((chapter, index) => {
                                const src = chapter.content['$'].src
                                chapter.id = `${src}`
                                chapter.href = `${dir}/${src}`.replace(this.unzipPath, '')
                                chapter.text = `${UPLOAD_URL}${dir}/${src}`
                                chapter.label = chapter.navLabel.text || ''
                                chapter.navId = chapter['$'].id
                                chapter.fileName = this.fileName
                                chapter.order = index + 1
                                chapter.children = []
                                chapters.push(chapter)
                            })
                            const chapterTree = Book.genContentsTree(chapters)
                            resolve({ chapters, chapterTree })
                        } else {
                            reject(new Error("目錄解析失敗, 目錄數為0"))
                        }
                    }
                })
            })
        } else {
            throw new Error('目錄文件不存在')
        }
    }

    toDB() {
        return {
            fileName: this.fileName,
            cover: this.cover,
            title: this.title,
            author: this.author,
            publisher: this.publisher,
            bookId: this.bookId,
            language: this.language,
            rootFile: this.rootFile,
            originalName: this.originalName,
            filePath: this.filePath,
            unzipPath: this.unzipPath,
            coverPath: this.coverPath,
            createUser: this.createUser,
            createDt: this.createDt,
            updateDt: this.updateDt,
            updateType: this.updateType,
            category: this.category,
            categoryText: this.categoryText
        }
    }

    getContents() {
        return this.contents
    }

    reset() {
        if (Book.pathExists(this.filePath)) {
            fs.unlinkSync(Book.genPath(this.filePath))
        }
        if (Book.pathExists(this.coverPath)) {
            fs.unlinkSync(Book.genPath(this.coverPath))
        }
        if (Book.pathExists(this.unzipPath)) {
            fs.rmdirSync(Book.genPath(this.unzipPath), { recursive: true })
        }
    }

    static genPath(path) {
        if (!path.startsWith('/')) {
            path = `/${path}`
        }
        return `${UPLOAD_PATH}${path}`
    }

    static pathExists(path) {
        if (path.startsWith(UPLOAD_PATH)) {
            return fs.existsSync(path)
        } else {
            return fs.existsSync(Book.genPath(path))
        }
    }

    static genCoverUrl(book) {
        const { cover } = book
        if (cover) {
            if (cover.startsWith('/')) {
                return `${UPLOAD_URL}${cover}`
            } else {
                return `${UPLOAD_URL}/${cover}`
            }
        } else {
            return null
        }
    }

    static genContentsTree(contents) {
        const contentsTree = []
        if (contents) {
            contents.forEach(c => {
                c.children = []
                if (c.pid === '') {
                    contentsTree.push(c)
                } else {
                    const parent = contents.find(_ => {
                        return _.navId === c.pid
                    })
                    parent.children.push(c)
                }
            })
        }
        return contentsTree
    }
}

module.exports = Book