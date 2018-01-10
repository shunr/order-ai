sudo rm -fr pjproject-2.7.1
wget http://www.pjsip.org/release/2.7.1/pjproject-2.7.1.tar.bz2
tar -xf pjproject-2.7.1.tar.bz2 && rm pjproject-2.7.1.tar.bz2 && cd pjproject-2.7.1/
export CFLAGS="$CFLAGS -fPIC"
./aconfigure --disable-sdl --disable-ffmpeg --disable-v412 --disable-openh264 --disable-libwebrtc && make dep && make
sudo make install
cd pjsip-apps/src/python/
sudo python setup.py install
cd ~/