#!/usr/bin/env bash
# 测试终端版实操模式：用真正的正确代码跑判分
set -u
cd "D:/c语言"

rm -f practice.c practice.exe practice_in.txt practice_out.txt

# 1) 先生成模板：p -> 题1 -> 回车
printf 'p\n1\n\n' | timeout 20 ./c-quest.exe > /tmp/p1.txt 2>&1
echo "=== 第 1 阶段：生成模板 ==="
grep -c "practice.c" /tmp/p1.txt && echo "模板已生成" || echo "模板未生成"
ls -la practice.c 2>/dev/null | head -1

# 2) 把正确代码写进去
cat > practice.c <<'EOF'
#include <stdio.h>

int main(void) {
    int a, b, t;
    scanf("%d %d", &a, &b);
    t = a;
    a = b;
    b = t;
    printf("%d %d\n", a, b);
    return 0;
}
EOF
echo "=== 已写入正确代码 ==="

# 3) 再次进入：p -> 题1 -> n（保留我的代码）-> 回车（开始编译）
printf 'p\n1\nn\n\n' | timeout 40 ./c-quest.exe > /tmp/p2.txt 2>&1
echo "=== 第 2 阶段：编译判分 ==="
sed -n '/正在编译/,$p' /tmp/p2.txt | head -40
