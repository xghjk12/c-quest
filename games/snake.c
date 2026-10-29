/* =============================================================
 *  贪吃蛇 · Snake（Windows 控制台版）
 *
 *  编译：  tcc -o snake.exe snake.c
 *  运行：  snake.exe
 *  操作：  W/A/S/D 或方向键转向，Q 退出，空格暂停
 *
 *  ── 这个文件里能用到的知识点 ──────────────────────────────
 *  1. 二维数组当游戏地图        board[HEIGHT][WIDTH]
 *  2. 结构体存蛇身              Snake { Point body[MAX]; int len; }
 *  3. 数组当队列：头插尾删      移动时把新头放 body[0]，末尾裁掉
 *  4. rand() + srand(time(0))   随机生成食物
 *  5. kbhit()      非阻塞查键   没有按键时循环继续跑
 *  6. _getch()     立即读键     不用按回车
 *  7. Sleep(ms)    控制帧率
 *  8. gotoxy()     光标定位     只重画变化的地方，避免闪屏
 *  9. 方向枚举     防止 180 度掉头
 * 10. 撞墙 / 撞自己 的判定
 * ============================================================= */
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
#include <string.h>

#ifdef _WIN32
#include <windows.h>
#include <conio.h>
#endif

/* ---------------- 配置 ---------------- */
#define WIDTH   30      /* 可玩区域宽（不含边框）*/
#define HEIGHT  20      /* 可玩区域高 */
#define MAX_LEN (WIDTH * HEIGHT)

#define WALL  '#'
#define BODY  'O'
#define HEAD  '@'
#define FOOD  '*'
#define EMPTY ' '

/* ---------------- 方向 ---------------- */
enum Direction { DIR_UP = 0, DIR_DOWN, DIR_LEFT, DIR_RIGHT };

typedef struct {
    int x;
    int y;
} Point;

typedef struct {
    Point body[MAX_LEN];
    int   len;
    enum Direction dir;
} Snake;

/* ---------------- 全局（小游戏图省事）---------------- */
static int  gameOver;
static int  paused;
static int  score;
static Point food;
static Snake snake;
static int  board[HEIGHT][WIDTH];   /* 0=空 1=蛇身 */

/* =============================================================
 *  底层：控制台操作
 * ============================================================= */

/* 把光标移到 (x, y)，左上角是 (0,0) */
void gotoxy(int x, int y) {
#ifdef _WIN32
    COORD pos;
    pos.X = (SHORT)x;
    pos.Y = (SHORT)y;
    SetConsoleCursorPosition(GetStdHandle(STD_OUTPUT_HANDLE), pos);
#else
    printf("\033[%d;%dH", y + 1, x + 1);
#endif
}

/* 隐藏光标（不然它会一直闪，很难看） */
void hideCursor(void) {
#ifdef _WIN32
    CONSOLE_CURSOR_INFO info;
    info.dwSize = 100;
    info.bVisible = FALSE;
    SetConsoleCursorInfo(GetStdHandle(STD_OUTPUT_HANDLE), &info);
#endif
}

void showCursor(void) {
#ifdef _WIN32
    CONSOLE_CURSOR_INFO info;
    info.dwSize = 100;
    info.bVisible = TRUE;
    SetConsoleCursorInfo(GetStdHandle(STD_OUTPUT_HANDLE), &info);
#endif
}

#ifdef _WIN32
void setColor(int color) {
    SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), (WORD)color);
}
#else
void setColor(int color) { (void)color; }
#endif

void resetColor(void) {
#ifdef _WIN32
    SetConsoleTextAttribute(GetStdHandle(STD_OUTPUT_HANDLE), 7);
#endif
}

/* =============================================================
 *  游戏逻辑
 * ============================================================= */

/* 在空白格子随机放一个食物 */
void spawnFood(void) {
    int tries = 0;
    do {
        food.x = rand() % WIDTH;
        food.y = rand() % HEIGHT;
        tries++;
        /* 防止死循环：如果蛇已经占满整个地图，就没地方放了 */
        if (tries > 10000) return;
    } while (board[food.y][food.x] != 0);
}

void initGame(void) {
    int i;

    memset(board, 0, sizeof(board));

    snake.len = 3;
    snake.dir = DIR_RIGHT;
    /* 初始身体：头在最前，横向排开 */
    snake.body[0].x = WIDTH / 2;
    snake.body[0].y = HEIGHT / 2;
    snake.body[1].x = WIDTH / 2 - 1;
    snake.body[1].y = HEIGHT / 2;
    snake.body[2].x = WIDTH / 2 - 2;
    snake.body[2].y = HEIGHT / 2;

    for (i = 0; i < snake.len; i++)
        board[snake.body[i].y][snake.body[i].x] = 1;

    gameOver = 0;
    paused = 0;
    score = 0;

    spawnFood();
}

/* 画整个地图（只在开局和每帧重绘时用） */
void drawBoard(void) {
    int x, y;

    /* 上边框 */
    gotoxy(0, 0);
    for (x = 0; x < WIDTH + 2; x++) putchar(WALL);
    putchar('\n');

    for (y = 0; y < HEIGHT; y++) {
        putchar(WALL);
        for (x = 0; x < WIDTH; x++) {
            int isHead = (snake.body[0].x == x && snake.body[0].y == y);
            int isBody = board[y][x];
            if (isHead) {
                setColor(10);
                putchar(HEAD);
                resetColor();
            } else if (isBody) {
                setColor(14);
                putchar(BODY);
                resetColor();
            } else if (food.x == x && food.y == y) {
                setColor(12);
                putchar(FOOD);
                resetColor();
            } else {
                putchar(EMPTY);
            }
        }
        putchar(WALL);
        putchar('\n');
    }

    /* 下边框 */
    for (x = 0; x < WIDTH + 2; x++) putchar(WALL);
    putchar('\n');

    printf("  得分: %d   长度: %d      ", score, snake.len);
    printf("\n  W/A/S/D 转向  空格 暂停  Q 退出   ");
}

/* 只重画变化的两格（新头、旧尾）——这是不闪屏的关键 */
void redrawTile(int x, int y) {
    int isHead = (snake.body[0].x == x && snake.body[0].y == y);
    int isBody = board[y][x];

    gotoxy(x + 1, y + 1);   /* +1 是因为有边框 */
    if (isHead) {
        setColor(10);
        putchar(HEAD);
    } else if (isBody) {
        setColor(14);
        putchar(BODY);
    } else if (food.x == x && food.y == y) {
        setColor(12);
        putchar(FOOD);
    } else {
        putchar(EMPTY);
    }
    resetColor();
}

/* 处理按键。注意 _getch() 读方向键会先返回 0 或 224，
   需要再读一个字节才是真正的键码。 */
void handleInput(void) {
#ifdef _WIN32
    int key;
    if (!kbhit()) return;

    key = _getch();
    if (key == 0 || key == 224) {   /* 方向键的前导字节 */
        key = _getch();
        switch (key) {
            case 72: if (snake.dir != DIR_DOWN)  snake.dir = DIR_UP;    break;
            case 80: if (snake.dir != DIR_UP)    snake.dir = DIR_DOWN;  break;
            case 75: if (snake.dir != DIR_RIGHT) snake.dir = DIR_LEFT;  break;
            case 77: if (snake.dir != DIR_LEFT)  snake.dir = DIR_RIGHT; break;
            default: break;
        }
        return;
    }

    switch (key) {
        case 'w': case 'W': if (snake.dir != DIR_DOWN)  snake.dir = DIR_UP;    break;
        case 's': case 'S': if (snake.dir != DIR_UP)    snake.dir = DIR_DOWN;  break;
        case 'a': case 'A': if (snake.dir != DIR_RIGHT) snake.dir = DIR_LEFT;  break;
        case 'd': case 'D': if (snake.dir != DIR_LEFT)  snake.dir = DIR_RIGHT; break;
        case ' ': paused = !paused; break;
        case 'q': case 'Q': gameOver = 1; break;
        default: break;
    }
#else
    /* 非 Windows 环境只做占位 */
#endif
}

/* 走一步。返回 0 表示撞死了 */
int step(void) {
    Point next;
    Point tail;
    int i;

    /* 1. 算出新头位置 */
    next = snake.body[0];
    switch (snake.dir) {
        case DIR_UP:    next.y -= 1; break;
        case DIR_DOWN:  next.y += 1; break;
        case DIR_LEFT:  next.x -= 1; break;
        case DIR_RIGHT: next.x += 1; break;
    }

    /* 2. 撞墙判断 */
    if (next.x < 0 || next.x >= WIDTH || next.y < 0 || next.y >= HEIGHT)
        return 0;

    /* 3. 撞自己判断。
          注意：尾巴这一格马上要移走，所以"吃到食物"时尾巴不动，
          那时撞尾巴才算死；平时撞尾巴是允许的。 */
    for (i = 0; i < snake.len; i++) {
        if (snake.body[i].x == next.x && snake.body[i].y == next.y) {
            int isTail = (i == snake.len - 1);
            int eating = (next.x == food.x && next.y == food.y);
            if (!isTail || eating)
                return 0;
        }
    }

    /* 4. 记住旧尾巴（要擦掉） */
    tail = snake.body[snake.len - 1];

    /* 5. 身体整体后移一格，再放上新头 */
    for (i = snake.len - 1; i > 0; i--)
        snake.body[i] = snake.body[i - 1];
    snake.body[0] = next;

    /* 6. 判断吃没吃到食物 */
    if (next.x == food.x && next.y == food.y) {
        /* 长了：尾巴不裁，board 上新头置 1 */
        if (snake.len < MAX_LEN) snake.len++;
        board[next.y][next.x] = 1;
        score += 10;
        spawnFood();
        /* 吃到的时候要重画旧尾巴留下的格子吗？不需要，尾巴没动 */
    } else {
        /* 没吃到：裁掉旧尾巴 */
        board[tail.y][tail.x] = 0;
        board[next.y][next.x] = 1;
        redrawTile(tail.x, tail.y);
    }

    /* 7. 只重画新头（身体/尾巴已经通过上面两行处理好） */
    redrawTile(next.x, next.y);

    /* 8. 如果长长了，原来的"第二格"要变成身体色 */
    if (snake.len > 1) {
        redrawTile(snake.body[1].x, snake.body[1].y);
    }

    /* 9. 分数变了就更新状态栏 */
    gotoxy(0, HEIGHT + 2);
    printf("  得分: %d   长度: %d      ", score, snake.len);
    fflush(stdout);

    return 1;
}

/* =============================================================
 *  自测模式：只跑逻辑，不画界面、不等按键
 *  用固定种子和给定方向序列跑若干步，把关键状态打到 stdout。
 *  这样自动化测试可以精确断言"蛇走了几步、吃到没吃到、死在哪"。
 * ============================================================= */
int selfTest(unsigned seed, const char *moves, int frames) {
    int i;
    int movesLen = (int)strlen(moves);

    srand(seed);
    initGame();

    for (i = 0; i < frames; i++) {
        /* 只有把方向表走完之前才读字符。
           i >= movesLen 时必须跳过，否则会读到字符串结尾之后的内存。 */
        if (i < movesLen && moves[i] != '\0') {
            switch (moves[i]) {
                case 'U': if (snake.dir != DIR_DOWN)  snake.dir = DIR_UP;    break;
                case 'D': if (snake.dir != DIR_UP)    snake.dir = DIR_DOWN;  break;
                case 'L': if (snake.dir != DIR_RIGHT) snake.dir = DIR_LEFT;  break;
                case 'R': if (snake.dir != DIR_LEFT)  snake.dir = DIR_RIGHT; break;
                default: break;
            }
        }

        if (!step()) {
            gameOver = 1;
            break;
        }
    }

    printf("frames=%d score=%d len=%d head=(%d,%d) dead=%d\n",
           i, score, snake.len,
           snake.body[0].x, snake.body[0].y,
           gameOver ? 1 : 0);
    return gameOver ? 1 : 0;
}

/* =============================================================
 *  主循环
 * ============================================================= */
int main(int argc, char **argv) {
    int speed = 150;   /* 毫秒/帧，越小越快 */

    /* 自测模式：snake.exe --selftest <seed> <moves> <frames> */
    if (argc >= 5 && strcmp(argv[1], "--selftest") == 0) {
        int rc = selfTest((unsigned)atoi(argv[2]), argv[3], atoi(argv[4]));
        return rc;
    }

#ifdef _WIN32
    /* 让中文正常显示 */
    SetConsoleOutputCP(65001);
    /* 清屏 */
    system("cls");
#endif

    srand((unsigned)time(NULL));   /* 每次运行食物都不一样 */

    hideCursor();
    initGame();
    drawBoard();

    while (!gameOver) {
        handleInput();

        if (!paused) {
            if (!step()) {
                gameOver = 1;
                break;
            }
        }

        Sleep(speed);
    }

    /* ---------- 结束画面 ---------- */
    showCursor();
    gotoxy(0, HEIGHT + 4);
    resetColor();
    printf("\n  ============================\n");
    printf("       游戏结束！\n");
    printf("       得分: %d\n", score);
    printf("       最终长度: %d\n", snake.len);
    printf("  ============================\n\n");

    system("pause");
    return 0;
}
