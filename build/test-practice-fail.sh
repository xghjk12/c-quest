#!/usr/bin/env bash
# 测试终端版实操：写一个"差一点"的代码，看重不看出差异
set -u
cd "D:/c语言"

rm -f practice.c practice.exe practice_in.txt practice_out.txt

# 生成模板
printf 'p\n1\n\n' | timeout 20 ./c-quest.exe > /dev/null 2>&1

# 写一个"少一个换行"的错答案（很常见的新手错误）
cat > practice.c <<'EOF'
#include <stdio.h>

int main(void) {
    int a, b, t;
    scanf("%d %d", &a, &b);
    t = a; a = b; b = t;
    printf("%d %d", a, b);   /* 故意不加 \n */
    return 0;
}
EOF

printf 'p\n1\nn\n\n' | timeout 40 ./c-quest.exe 2>&1 | sed -n '/正在跑测试用例/,/注意上面/p' | head -20

# 再测一个编译错误
rm -f practice.c
printf 'p\n1\n\n' | timeout 20 ./c-quest.exe > /dev/null 2>&1
cat > practice.c <<'EOF'
#include <stdio.h>
int main(void) {
    int a, b
    return 0;
}
EOF
echo "=== 编译错误测试 ==="
printf 'p\n1\nn\n\n' | timeout 40 ./c-quest.exe 2>&1 | sed -n '/正在编译/,/再回来/p' | head -14

rm -f practice.exe practice_in.txt practice_out.txt
