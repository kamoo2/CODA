### Analyzer Cloud Version 

#### 백엔드 

- java 17.0.3 (jdk)
- spring boot 3.4.2

#### 폴더 구조 

- controller
  - RestController로 @Controller + @ResponseBody가 합쳐진 것으로 Json형태의 데이터를 반환하기 위해 사용
  - @ResponseBody : 단순 응답 반환 
  - @ResponseEntity : Response 객체를 만들어서 좀 더 유연하게 상태코드나 메시지등을 담아서 함께 반환
  - ```java
    // Controller 예시 코드 
    @RestController
    @RequiredArgsConstructor
    public class UserController {
        private final PostService postService;
        
        @GetMapping("/post")
        public ResponseEntity<MyResponseDto> getPostList(){
            List<Post> posts = postService.getPostAll();
            MyResponseDto response = new MyResponseDto(200, "Success", posts);
            return ResponseEntity.ok(response);
        }
    }
    ```

- service 
  - Repository에서 받아온 데이터를 받아 가공한다.
  - ```java
    @Service
    @Transactional
    @RequiredArgsConstructor 
    public class PostService {
        private final PostRepository postRepository;
        
        // Post 조회
        public List<PostDto> getPostAll() {
            // Repository에서 엔티티 조회
            List<Post> posts = postRepository.findAll();

            // Post 엔티티를 PostDto로 변환하여 반환
            return posts.stream()
                    .map(post -> new PostDto(
                         post.getId(),
                         post.getTitle(),
                         post.getContent(),
                         post.getAuthor(),
                         post.getCreatedAt()
                    ))
                    .collect(Collectors.toList());
        }
    }
    ```
- repository
  - Entity에 의해 생성된 DB에 접근하기 위한 인터페이스이다.
  - 직접 쿼리문을 작성하기도 하고 JPA를 사용하여 보다 쉽게 접근하기도 한다.
  - ```java
        @Repository
        public interface PostRepository extends CrudRepository<Post,Long>  {
            // 모든 게시글 조회를 JPQL로 명시
            @Query("SELECT p FROM Post p")
            List<Post> findAll();
        }
    ```
- entity
  - 실제 DB 테이블과 매핑되는 요소 
  - 하나의 객체가 DB 하나의 Column 
  - ```java
    @Entity
    @Getter
    @Table(name = "COMMENT")
    public class CommentEntity{
      @Id
      @GeneratedValue(strategy = GenerationType.IDENTITY)
      private Long id;
    
      @Column
      private String commentContents;
    
      @ManyToOne(fetch = FetchType.LAZY)
      @JoinColumn(name = "post_id")
      private PostEntity postEntity;
    }
    ```
- dto
  - Controller, Service, Repository 등 각 계층간 데이터 교환할 때 Entity로 통신하는 것은 보안에 좋지 못하다고 함 
  - 그래서 DTO를 사용 
  - ```java
      @Getter
      @Setter
      @ToString
      public class PostDTO{
        private Long id;
        private String commentWriter;
        private String commentContents;
        private Long postId;
        private LocalDateTime commentCreatedTime;
      }   
    ```
- config 
  - Spring Boot의 Config 설정 파일들을 모아두는 폴더 
  - Spring Security Configuration과 같은 Config 설정 파일들이 해당됨 

#### 총 6개의 폴더 구조로 구성했고 추가적으로 필요한 부분은 추후에 추가할 예정 

#### Controller 설계 
- UserController 
  - 유저 관련 컨트롤러
- CloudStorageController
  - 클라우드 저장소 관련 컨트롤러 
- AnalysisController 
  - 분석 컨트롤러 

#### GRPC
- Camera Data
  - Client <-> Server 통신
  - GRPC는 byte[]를 지원하지 않기 때문에 ByteString으로 변환하고 서버측에서도 다시 변환해줘야함 
  - 시간이 오래걸려 비효율적임 
  - 그래서 단일로 Video 파일 경로를 전달해주고 Python 서버측에서 프레임 추출과 동시에 로깅하는 방식으로 구현
- Lidar Data 
  - Client Stream <-> Server 통신
  - 1Frame 단위로 서버로 Send 
- GPS Data 
  - 1Frame 단위로 서버로 Send
- 신호 데이터 
  - 구현 중 