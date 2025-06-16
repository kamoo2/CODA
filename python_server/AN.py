import json

class AN:
    @staticmethod
    def read(path):
        """스트리밍 방식으로 데이터 파일을 읽어 한 줄씩 JSON 파싱해서 반환"""
        with open(path, 'r') as f:
            for line in f:
                yield json.loads(line)

    @staticmethod
    def printInfo():
        """AN 모듈 정보 출력"""
        print("📊 AN Module Information 📊")
        print(" - read(path): JSON 스트리밍 데이터 리더")
        print(" - printInfo(): 모듈 정보 출력")