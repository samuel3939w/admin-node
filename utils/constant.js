const UPLOAD_PATH='C:/Users/samuelchen/Desktop/resource'
const UPLOAD_URL='http://localhost:8081/'

module.exports = {
    CODE_ERROR: -1,
    CODE_SUCCESS: 0,
    CODE_TOKEN_EXPIRED:-2,
    debug: true,
    PWD_SALT: 'admin_imooc_node',
    PRIVATE_KEY: 'admin_imooc_node_test_youbaobao_xyz',
    JWT_EXPIRED: 60 * 60, // token失效时间
    UPLOAD_PATH,
    MIME_TYPE_EPUB:"application/epub+zip",
    UPLOAD_URL
}