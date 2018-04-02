
FROM node:latest

WORKDIR /usr/src/order-ai

# Basic dependencies

RUN \
  apt-get update && \
  apt-get install -y libtool python3-pip python3-dev libasound2-dev portaudio19-dev && \
  rm -rf /var/lib/apt/lists/*

# Install pjsip

RUN \
  wget http://www.pjsip.org/release/2.7.2/pjproject-2.7.2.tar.bz2 && \
  tar -xf pjproject-2.7.2.tar.bz2 && \
  rm pjproject-2.7.2.tar.bz2 && \
  cd pjproject-2.7.2/ && \
  export CFLAGS="$CFLAGS -fPIC -O2 -DNDEBUG" && \
  ./aconfigure --disable-sdl --disable-ffmpeg --disable-v412 --disable-openh264 --disable-libwebrtc && \
  make dep && make && make install

COPY package*.json ./

RUN npm install

COPY . .

ENV \
  SIP_PORT=3000 \
  SIP_PORTRANGE=10 \
  GOOGLE_APPLICATION_CREDENTIALS=./credentials/dialogflow.json
  
EXPOSE $SIP_PORT

CMD [ "npm", "start" ]