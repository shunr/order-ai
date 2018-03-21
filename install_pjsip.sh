apt-get update
apt-get install -y libportaudio-dev
rm -fr pjproject-2.7.2
wget http://www.pjsip.org/release/2.7.2/pjproject-2.7.2.tar.bz2
tar -xf pjproject-2.7.2.tar.bz2 && rm pjproject-2.7.2.tar.bz2 && cd pjproject-2.7.2/
export CFLAGS="$CFLAGS -fPIC -O2 -DNDEBUG"
./aconfigure --disable-sdl --disable-ffmpeg --disable-v412 --disable-openh264 --disable-libwebrtc && make dep && make
make install