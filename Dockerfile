# ベースイメージとしてNode.js 18を使用
FROM node:18

# 作業ディレクトリを作成
WORKDIR /usr/src/app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# アプリケーションコードをコピー
COPY . .

# アプリケーションを起動
CMD [ "node", "app.js" ]

