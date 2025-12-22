function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    return (hash >>> 0).toString(16); // 转换为十六进制字符串，与后端保持一致
}

console.log('test123的哈希值:', hashPassword('test123'));