from io import BufferedReader
import boto3
from io import BytesIO
import json


def open_s3_stream(file_path: str, credential) -> BufferedReader:
    access_key = credential.access_key
    secret_key = credential.secret_key
    region_name = credential.region_name
    bucket_name = credential.bucket_name

    endpoint = f"https://s3.{region_name}.wasabisys.com"
    s3 = boto3.client(
        "s3",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region_name,
        endpoint_url=endpoint
    )

    bucket, key = bucket_name, file_path
    obj = s3.get_object(Bucket=bucket, Key=key)
    return BufferedReader(obj["Body"])


def read_json_from_path(json_path: str, access_key, secret_key, region_name, bucket_name) -> dict:
    endpoint = f"https://s3.{region_name}.wasabisys.com"
    s3 = boto3.client(
        "s3",
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region_name,
        endpoint_url=endpoint  # ✅ 필수!
    )

    obj = s3.get_object(Bucket=bucket_name, Key=json_path)
    return json.load(BytesIO(obj["Body"].read()))


def get_project_info_key(file_path: str) -> str:
    parts = file_path.strip("/").rsplit("/")

    if not parts:
        raise ValueError("Invalid file path")

    top_level = parts[0]
    return f"{top_level}/projectInfo.json"
